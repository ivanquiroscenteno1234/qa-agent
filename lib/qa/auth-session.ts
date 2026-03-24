import type { Locator, Page } from "playwright";

import type { ParsedStep, RunPlan } from "@/lib/types";

type LoginOutcome = { observedTarget: string; actionResult: string; notes: string };

interface AuthSessionDependencies {
  findFirstVisible: (locator: Locator) => Promise<Locator | null>;
  executeLogin: (page: Page, parsedSteps: ParsedStep[], plan: RunPlan) => Promise<LoginOutcome>;
}

export async function resolveCredentials(plan: RunPlan, parsedSteps: ParsedStep[]): Promise<{ email: string; password: string }> {
  if (plan.loginEmail && plan.loginPassword) {
    return { email: plan.loginEmail, password: plan.loginPassword };
  }

  const loginStep = parsedSteps.find((step) => step.actionType === "login");
  const raw = loginStep?.rawText ?? "";
  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const password = raw.match(/password\s+([^\s]+)|contrase\w+\s+([^\s]+)/i);

  return {
    email,
    password: password?.[1] ?? password?.[2] ?? ""
  };
}

export async function pageHasLoginForm(page: Page, deps: Pick<AuthSessionDependencies, "findFirstVisible">): Promise<boolean> {
  const emailInput =
    (await deps.findFirstVisible(page.getByLabel(/correo|email|electr[oó]nico|username|usuario/i))) ??
    (await deps.findFirstVisible(page.getByPlaceholder(/correo|email/i))) ??
    (await deps.findFirstVisible(page.locator('input[type="email"], input[name*="email"], input[autocomplete="email"]')));

  const passwordInput =
    (await deps.findFirstVisible(page.getByLabel(/contrase|password/i))) ??
    (await deps.findFirstVisible(page.locator('input[type="password"], input[name*="password"]')));

  return Boolean(emailInput && passwordInput);
}

export async function ensureAuthenticatedState(
  page: Page,
  plan: RunPlan,
  deps: AuthSessionDependencies
): Promise<string> {
  await page.goto(plan.targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  if (await pageHasLoginForm(page, deps)) {
    const login = await deps.executeLogin(page, [], plan);
    return login.notes;
  }

  return `Session is already authenticated at ${page.url()}.`;
}

export function buildProtectedRouteUrl(plan: RunPlan): string {
  try {
    const target = new URL(plan.targetUrl);
    return new URL("/home/dashboard", target).toString();
  } catch {
    return `${plan.targetUrl.replace(/\/$/, "")}/home/dashboard`;
  }
}