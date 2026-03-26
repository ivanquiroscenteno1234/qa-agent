import { chromium, firefox, webkit, type Locator, type Page } from "playwright";

import { hasCredentialSource } from "@/lib/qa/auth-session";
import type { ParsedStep, RunPlan } from "@/lib/types";

type ExecutionOutcome = { observedTarget: string; actionResult: string; notes: string };

interface TextMatchingDependencies {
  normalizeText: (value: string) => string;
  expandedTerms: (value: string) => string[];
  toRegex: (value: string) => RegExp;
}

interface BrowserRuntimeDependencies extends TextMatchingDependencies {
  firstVisibleByPatterns: (page: Page, patterns: string[]) => Promise<Locator | null>;
  findFirstVisible: (locator: Locator) => Promise<Locator | null>;
  resolveCredentials: (plan: RunPlan, parsedSteps: ParsedStep[]) => Promise<{ email: string; password: string }>;
  dismissEditDialog: (page: Page) => Promise<void>;
}

export function resolveBrowser(browserName: string, normalizeText: (value: string) => string) {
  const normalized = normalizeText(browserName);
  if (normalized.includes("firefox")) {
    return firefox;
  }
  if (normalized.includes("webkit") || normalized.includes("safari")) {
    return webkit;
  }
  return chromium;
}

export async function findFirstVisible(locator: Locator): Promise<Locator | null> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

export async function firstVisibleByPatterns(page: Page, patterns: string[], deps: TextMatchingDependencies): Promise<Locator | null> {
  const normalizedTerms = patterns.flatMap((pattern) => deps.expandedTerms(pattern)).map((term) => deps.normalizeText(term));

  for (const pattern of patterns) {
    const regex = deps.toRegex(pattern);
    const candidates = [
      page.getByRole("button", { name: regex }),
      page.getByRole("link", { name: regex }),
      page.getByRole("tab", { name: regex }),
      page.getByRole("heading", { name: regex }),
      page.getByText(regex)
    ];

    for (const candidate of candidates) {
      const visible = await findFirstVisible(candidate);
      if (visible) {
        return visible;
      }
    }
  }

  const semanticCandidates = page.locator('button, a, [role="tab"], [role="button"], h1, h2, h3, h4, [data-testid]');
  const count = await semanticCandidates.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = semanticCandidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    const text = deps.normalizeText((await candidate.textContent()) ?? "");
    if (!text) {
      continue;
    }

    if (normalizedTerms.some((term) => text.includes(term) || term.includes(text))) {
      return candidate;
    }
  }

  return null;
}

export async function pageHasLoginForm(page: Page, deps: Pick<BrowserRuntimeDependencies, "findFirstVisible">): Promise<boolean> {
  const emailInput =
    (await deps.findFirstVisible(page.getByLabel(/correo|email|electr[oó]nico|username|usuario/i))) ??
    (await deps.findFirstVisible(page.getByPlaceholder(/correo|email/i))) ??
    (await deps.findFirstVisible(page.locator('input[type="email"], input[name*="email"], input[autocomplete="email"]')));

  const passwordInput =
    (await deps.findFirstVisible(page.getByLabel(/contrase|password/i))) ??
    (await deps.findFirstVisible(page.locator('input[type="password"], input[name*="password"]')));

  return Boolean(emailInput && passwordInput);
}

export async function dismissEditDialog(
  page: Page,
  firstVisibleByPatterns: (page: Page, patterns: string[]) => Promise<Locator | null>
): Promise<void> {
  const cancel = await firstVisibleByPatterns(page, ["cancelar", "cancel", "close", "cerrar"]);
  if (cancel) {
    await cancel.click();
    return;
  }

  await page.keyboard.press("Escape").catch(() => undefined);
}

function resolveNavigationDestination(step: ParsedStep, plan: RunPlan): string {
  const target = step.targetDescription.trim().replace(/[.,;:!?]+$/, "");

  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3}|[a-z0-9.-]+\.[a-z]{2,})(?:[:/]\S*)?$/i.test(target)) {
    return `https://${target}`;
  }

  return plan.targetUrl;
}

export async function executeNavigate(page: Page, step: ParsedStep, plan: RunPlan): Promise<ExecutionOutcome> {
  const targetUrl = resolveNavigationDestination(step, plan);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);

  return {
    observedTarget: targetUrl,
    actionResult: `Navigated to ${targetUrl}.`,
    notes: `Current title: ${await page.title()}`
  };
}

export async function executeLogin(
  page: Page,
  parsedSteps: ParsedStep[],
  plan: RunPlan,
  deps: Pick<BrowserRuntimeDependencies, "findFirstVisible" | "resolveCredentials">
): Promise<ExecutionOutcome> {
  const credentials = await deps.resolveCredentials(plan, parsedSteps);
  if (!credentials.email || !credentials.password) {
    throw new Error("No login credentials were provided in the run plan or login step.");
  }

  const emailInput =
    (await deps.findFirstVisible(page.getByLabel(/correo|email|electr[oó]nico|username|usuario/i))) ??
    (await deps.findFirstVisible(page.getByPlaceholder(/correo|email/i))) ??
    (await deps.findFirstVisible(page.locator('input[type="email"], input[name*="email"], input[autocomplete="email"]')));

  const passwordInput =
    (await deps.findFirstVisible(page.getByLabel(/contrase|password/i))) ??
    (await deps.findFirstVisible(page.locator('input[type="password"], input[name*="password"]')));

  if (!emailInput || !passwordInput) {
    throw new Error("Unable to resolve login inputs on the page.");
  }

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);

  const submit =
    (await deps.findFirstVisible(page.getByRole("button", { name: /iniciar sesi[oó]n|sign in|login|acceder/i }))) ??
    (await deps.findFirstVisible(page.locator('button[type="submit"], input[type="submit"]')));

  if (!submit) {
    throw new Error("Unable to resolve the login submit control.");
  }

  await submit.click();

  await Promise.race([
    page.waitForURL(/home|dashboard|onboarding/i, { timeout: 60_000 }),
    page.waitForSelector('text=Panel', { timeout: 60_000 }),
    page.waitForSelector('text=Menú', { timeout: 60_000 }),
    page.waitForFunction(() => !location.pathname.includes('/login'), { timeout: 60_000 })
  ]).catch(() => undefined);

  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  if (page.url().includes("/login")) {
    throw new Error("Login did not reach an authenticated application route.");
  }

  return {
    observedTarget: "Authentication",
    actionResult: `Authenticated as ${credentials.email}.`,
    notes: `Current URL after login: ${page.url()}`
  };
}

export async function executeOpenNavigation(
  page: Page,
  step: ParsedStep,
  deps: Pick<BrowserRuntimeDependencies, "firstVisibleByPatterns"> & { normalizeText: (value: string) => string }
): Promise<ExecutionOutcome> {
  const target = step.targetDescription || "Menu";
  const patterns = deps.normalizeText(target).includes("menu") ? ["menu", "menú"] : [target];
  const candidate = await deps.firstVisibleByPatterns(page, patterns);

  if (!candidate) {
    throw new Error(`Unable to find navigation target matching ${target}.`);
  }

  await candidate.click();
  await Promise.race([
    page.waitForSelector('text=Gestión de Menú', { timeout: 10_000 }),
    page.waitForSelector('text=Agregar Categoría', { timeout: 10_000 }),
    page.waitForTimeout(1_200)
  ]).catch(() => undefined);

  return {
    observedTarget: target,
    actionResult: `Opened navigation target matching ${target}.`,
    notes: `Current URL: ${page.url()}`
  };
}

export async function executeOpenSection(
  page: Page,
  step: ParsedStep,
  deps: Pick<BrowserRuntimeDependencies, "firstVisibleByPatterns">
): Promise<ExecutionOutcome> {
  const target = step.targetDescription;
  const candidate = await deps.firstVisibleByPatterns(page, [target]);

  if (!candidate) {
    throw new Error(`Unable to find a section matching ${target}.`);
  }

  await candidate.click();
  await Promise.race([
    page.waitForSelector('text=Editar', { timeout: 8_000 }),
    page.waitForSelector('text=Visible', { timeout: 8_000 }),
    page.waitForTimeout(1_000)
  ]).catch(() => undefined);

  return {
    observedTarget: target,
    actionResult: `Opened section matching ${target}.`,
    notes: "The agent used multilingual/fuzzy matching for the section target."
  };
}

export async function executeEditableAssertion(
  page: Page,
  parsedSteps: ParsedStep[],
  step: ParsedStep,
  plan: RunPlan,
  deps: Pick<BrowserRuntimeDependencies, "firstVisibleByPatterns" | "findFirstVisible" | "dismissEditDialog">
): Promise<ExecutionOutcome> {
  const lastSectionTarget = [...parsedSteps].reverse().find((item) => item.actionType === "open-section")?.targetDescription;
  const target = step.targetDescription.includes("report success") || step.targetDescription.includes("edit it")
    ? lastSectionTarget ?? step.targetDescription
    : step.targetDescription;

  let editButton = await deps.firstVisibleByPatterns(page, ["editar", "edit"]);

  if (!editButton && lastSectionTarget) {
    const sectionButton = await deps.firstVisibleByPatterns(page, [lastSectionTarget]);
    if (sectionButton) {
      await sectionButton.click();
      await Promise.race([
        page.waitForSelector('text=Editar', { timeout: 8_000 }),
        page.waitForSelector('text=Visible', { timeout: 8_000 }),
        page.waitForTimeout(1_000)
      ]).catch(() => undefined);
      editButton = await deps.firstVisibleByPatterns(page, ["editar", "edit"]);
    }
  }

  if (!editButton) {
    throw new Error(`No visible edit control was found while verifying ${target}.`);
  }

  await editButton.click();
  await page.waitForTimeout(800);

  const editableField =
    (await deps.findFirstVisible(page.locator('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])'))) ?? null;

  if (!editableField) {
    throw new Error(`Edit dialog opened, but no editable fields were found for ${target}.`);
  }

  const fieldLabel =
    (await editableField.getAttribute("aria-label")) ??
    (await editableField.getAttribute("name")) ??
    (await editableField.getAttribute("placeholder")) ??
    "editable field";

  if (plan.safeMode) {
    await deps.dismissEditDialog(page);
  }

  return {
    observedTarget: target,
    actionResult: `Edit control opened successfully and exposed ${fieldLabel}.`,
    notes: plan.safeMode
      ? "Safe mode confirmed editability without submitting changes."
      : "Interactive mode may proceed with write actions in future step handlers."
  };
}

export async function runStep(
  page: Page,
  parsedSteps: ParsedStep[],
  plan: RunPlan,
  step: ParsedStep,
  deps: {
    executeNavigate: typeof executeNavigate;
    executeLogin: (page: Page, parsedSteps: ParsedStep[], plan: RunPlan) => Promise<ExecutionOutcome>;
    executeOpenNavigation: (page: Page, step: ParsedStep) => Promise<ExecutionOutcome>;
    executeOpenSection: (page: Page, step: ParsedStep) => Promise<ExecutionOutcome>;
    executeEditableAssertion: (page: Page, parsedSteps: ParsedStep[], step: ParsedStep, plan: RunPlan) => Promise<ExecutionOutcome>;
    pageHasLoginForm: (page: Page) => Promise<boolean>;
    firstVisibleByPatterns: (page: Page, patterns: string[]) => Promise<Locator | null>;
  }
): Promise<ExecutionOutcome> {
  if (
    step.actionType !== "navigate" &&
    step.actionType !== "login" &&
    hasCredentialSource(plan) &&
    (await deps.pageHasLoginForm(page))
  ) {
    await deps.executeLogin(page, parsedSteps, plan);
  }

  switch (step.actionType) {
    case "navigate":
      return deps.executeNavigate(page, step, plan);
    case "login":
      return deps.executeLogin(page, parsedSteps, plan);
    case "open-navigation":
      return deps.executeOpenNavigation(page, step);
    case "open-section":
      return deps.executeOpenSection(page, step);
    case "assert-editable":
      return deps.executeEditableAssertion(page, parsedSteps, step, plan);
    case "assert-visible": {
      const visible = await deps.firstVisibleByPatterns(page, [step.targetDescription]);
      if (!visible) {
        throw new Error(`Expected visible target ${step.targetDescription} was not found.`);
      }
      return {
        observedTarget: step.targetDescription,
        actionResult: `Confirmed visibility of ${step.targetDescription}.`,
        notes: "Visibility assertion passed against the live page."
      };
    }
    default:
      return {
        observedTarget: step.targetDescription,
        actionResult: `Observed current page state for ${step.targetDescription}.`,
        notes: `No direct action mapping was required for ${step.actionType}.`
      };
  }
}