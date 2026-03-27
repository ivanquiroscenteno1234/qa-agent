import type { Locator, Page } from "playwright";

import { revealCredentialSecret } from "@/lib/qa/credential-secret";
import { getStoredCredentialLibrary, touchCredentialLibraryLastUsed } from "@/lib/qa/store";
import type { ParsedStep, RunPlan } from "@/lib/types";

type LoginOutcome = { observedTarget: string; actionResult: string; notes: string };
export type AuthStateOutcome = { observedTarget: string; notes: string; authenticatedViaLogin: boolean };

interface AuthSessionDependencies {
  findFirstVisible: (locator: Locator) => Promise<Locator | null>;
  executeLogin: (page: Page, parsedSteps: ParsedStep[], plan: RunPlan) => Promise<LoginOutcome>;
}

export function hasCredentialSource(plan: RunPlan): boolean {
  return Boolean(
    (plan.credentialLibraryId ?? "").trim() ||
      plan.credentialReference.trim() ||
      (plan.loginEmail.trim() && plan.loginPassword.trim())
  );
}

export async function resolveCredentials(plan: RunPlan, parsedSteps: ParsedStep[]): Promise<{ email: string; password: string }> {
  if (plan.loginEmail && plan.loginPassword) {
    return { email: plan.loginEmail, password: plan.loginPassword };
  }

  if ((plan.credentialLibraryId ?? "").trim()) {
    const credential = await getStoredCredentialLibrary(plan.credentialLibraryId ?? "");

    if (!credential) {
      throw new Error("The selected saved credential profile could not be found.");
    }

    if (credential.status === "revoked") {
      throw new Error(`Saved credential ${credential.label} is revoked and cannot be used for execution.`);
    }

    if (credential.password) {
      await touchCredentialLibraryLastUsed(credential.id);
      return { email: credential.username, password: revealCredentialSecret(credential.password) ?? "" };
    }

    if (credential.secretMode === "reference-only") {
      throw new Error(`Saved credential ${credential.label} is reference-only and cannot be used for automatic login yet.`);
    }
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
    (await deps.findFirstVisible(page.locator('input[type="email"], input[name*="email"], input[autocomplete="email"]'))) ??
    (await deps.findFirstVisible(page.locator('input[type="text"], input:not([type]), textarea')));

  const passwordInput =
    (await deps.findFirstVisible(page.getByLabel(/contrase|password/i))) ??
    (await deps.findFirstVisible(page.locator('input[type="password"], input[name*="password"]')));

  if (!emailInput || !passwordInput) {
    return false;
  }

  const emailHint = [
    await emailInput.getAttribute("name").catch(() => null),
    await emailInput.getAttribute("autocomplete").catch(() => null),
    await emailInput.getAttribute("placeholder").catch(() => null),
    await emailInput.getAttribute("aria-label").catch(() => null),
    await emailInput.evaluate((element) => (element as HTMLInputElement).type || "").catch(() => "")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const passwordHint = [
    await passwordInput.getAttribute("name").catch(() => null),
    await passwordInput.getAttribute("autocomplete").catch(() => null),
    await passwordInput.getAttribute("placeholder").catch(() => null),
    await passwordInput.getAttribute("aria-label").catch(() => null),
    await passwordInput.evaluate((element) => (element as HTMLInputElement).type || "").catch(() => "")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const emailLooksAuthentic = /correo|email|electr[oó]nico|username|usuario|mail/.test(emailHint) || emailHint.includes("text");
  const passwordLooksAuthentic = /contrase|password/.test(passwordHint);

  return emailLooksAuthentic && passwordLooksAuthentic;
}

export async function ensureAuthenticatedState(
  page: Page,
  plan: RunPlan,
  deps: AuthSessionDependencies
): Promise<AuthStateOutcome> {
  const authProbeUrl = hasCredentialSource(plan) ? buildProtectedRouteUrl(plan) : plan.targetUrl;

  await page.goto(authProbeUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  const endedOnLoginRoute = /login|signin|sign-in|auth/i.test(page.url());
  const sawLoginForm = await pageHasLoginForm(page, deps);

  if (hasCredentialSource(plan) && (sawLoginForm || endedOnLoginRoute)) {
    const login = await deps.executeLogin(page, [], plan);
    return {
      observedTarget: page.url(),
      notes: login.notes,
      authenticatedViaLogin: true
    };
  }

  if (endedOnLoginRoute) {
    throw new Error("Target redirected to a login route, but the QA runtime could not resolve a usable login form for automated authentication.");
  }

  return {
    observedTarget: page.url(),
    notes: `Session is already authenticated at ${page.url()}.`,
    authenticatedViaLogin: false
  };
}

export function buildProtectedRouteUrl(plan: RunPlan): string {
  try {
    const target = new URL(plan.targetUrl);
    return new URL("/home/dashboard", target).toString();
  } catch {
    return `${plan.targetUrl.replace(/\/$/, "")}/home/dashboard`;
  }
}