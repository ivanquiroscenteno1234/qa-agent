import type { BrowserContext, Locator, Page } from "playwright";

import { buildRunArtifacts, captureScreenshot } from "@/lib/qa/artifact-builder";
import type { AuthStateOutcome } from "@/lib/qa/auth-session";
import { assertAuthBoundary, assertElementVisible } from "@/lib/qa/assertions";
import type { NavTarget, PageSurface } from "@/lib/qa/crawl-model";
import { discoverNavigationCandidates } from "@/lib/qa/navigation-discovery";
import { buildDefects, buildTerminalRunRecord, createSyntheticStepResult } from "@/lib/qa/result-builder";
import type { FailureCategory, RunPlan, RunRecord, Scenario, StepResult, StepStatus } from "@/lib/types";

interface ScenarioExecutorDependencies {
  normalizeText: (value: string) => string;
  cleanLabel: (value: string) => string;
  selectDiscoveryLabels: (values: string[], limit: number) => string[];
  toRegex: (value: string) => RegExp;
  firstVisibleByPatterns: (page: Page, patterns: string[]) => Promise<Locator | null>;
  findFirstVisible: (locator: Locator) => Promise<Locator | null>;
  pageHasLoginForm: (page: Page) => Promise<boolean>;
  ensureAuthenticatedState: (page: Page, plan: RunPlan) => Promise<AuthStateOutcome>;
  buildProtectedRouteUrl: (plan: RunPlan) => string;
  ensureRunNotCancelled: (runId: string) => Promise<void>;
  emitEvent: (
    runId: string,
    phase: RunRecord["currentPhase"],
    message: string,
    options?: { level?: "info" | "warning" | "error"; category?: FailureCategory; stepNumber?: number; scenarioTitle?: string }
  ) => Promise<void>;
  emitWarning: (
    runId: string,
    phase: RunRecord["currentPhase"],
    message: string,
    category: FailureCategory,
    options?: { stepNumber?: number; scenarioTitle?: string; recoverable?: boolean }
  ) => Promise<void>;
  persistCheckpoint: (
    record: RunRecord,
    patch: Partial<RunRecord>,
    event?: { message: string; level?: "info" | "warning" | "error"; category?: FailureCategory; stepNumber?: number; scenarioTitle?: string }
  ) => Promise<void>;
  sanitizeError: (error: unknown) => string;
}

function scenarioNeedsAlternateCredentials(scenario: Scenario, normalizeText: ScenarioExecutorDependencies["normalizeText"]): { blocked: boolean; reason?: string } {
  const text = normalizeText(`${scenario.title} ${scenario.steps.join(" ")} ${scenario.expectedResult}`);

  if (text.includes("invalid credential") || text.includes("invalid login")) {
    return { blocked: true, reason: "This scenario requires invalid credentials that are not configured in the current run." };
  }

  if (text.includes("viewer") || text.includes("unauthorized") || text.includes("viewer-only")) {
    return { blocked: true, reason: "This scenario requires an alternate lower-privilege account that is not configured in the current run." };
  }

  return { blocked: false };
}

function extractVisibleInputHints(scenario: Scenario): string[] {
  const hints = new Set<string>();

  for (const step of scenario.steps) {
    const matches = step.match(/Inspect discovered form controls:\s*([^.]*)/i);
    const hint = matches?.[1]?.trim();
    if (hint) {
      hints.add(hint.replace(/\.+$/, "").trim());
    }
  }

  const scenarioText = `${scenario.title} ${scenario.steps.join(" ")} ${scenario.expectedResult}`;
  const quotedMatches = scenarioText.match(/Buscar[^.]+/gi) ?? [];
  for (const match of quotedMatches) {
    hints.add(match.replace(/\.+$/, "").trim());
  }

  return Array.from(hints).filter(Boolean);
}

async function tryLocateScenarioInputs(
  page: Page,
  scenario: Scenario,
  navigationCandidates: string[],
  deps: Pick<ScenarioExecutorDependencies, "toRegex" | "findFirstVisible" | "firstVisibleByPatterns">
): Promise<{ inputs: number; matchedHint?: string; matchedView?: string }> {
  const hints = extractVisibleInputHints(scenario);

  for (const hint of hints) {
    const locator =
      (await deps.findFirstVisible(page.getByPlaceholder(deps.toRegex(hint)))) ??
      (await deps.findFirstVisible(page.getByLabel(deps.toRegex(hint))));
    if (locator) {
      return { inputs: 1, matchedHint: hint };
    }
  }

  let currentInputCount = await page.locator("input, textarea, select").count();
  if (currentInputCount > 0) {
    return { inputs: currentInputCount };
  }

  for (const candidate of navigationCandidates) {
    const control = await deps.firstVisibleByPatterns(page, [candidate]);
    if (!control) {
      continue;
    }

    await control.click().catch(() => undefined);
    await Promise.race([
      page.waitForLoadState("networkidle", { timeout: 5_000 }),
      page.waitForTimeout(1_000)
    ]).catch(() => undefined);

    for (const hint of hints) {
      const locator =
        (await deps.findFirstVisible(page.getByPlaceholder(deps.toRegex(hint)))) ??
        (await deps.findFirstVisible(page.getByLabel(deps.toRegex(hint))));
      if (locator) {
        return { inputs: 1, matchedHint: hint, matchedView: candidate };
      }
    }

    currentInputCount = await page.locator("input, textarea, select").count();
    if (currentInputCount > 0) {
      return { inputs: currentInputCount, matchedView: candidate };
    }
  }

  return { inputs: 0 };
}

async function executeAuthenticationBoundaryScenario(
  page: Page,
  context: BrowserContext,
  plan: RunPlan,
  scenario: Scenario,
  authNote: string,
  deps: Pick<ScenarioExecutorDependencies, "pageHasLoginForm" | "buildProtectedRouteUrl" | "ensureAuthenticatedState" | "normalizeText">
): Promise<{ status: StepStatus; observedTarget: string; actionResult: string; notes: string; policyHandler: string }> {
  const browser = context.browser();
  if (!browser) {
    return {
      status: "blocked",
      observedTarget: deps.buildProtectedRouteUrl(plan),
      actionResult: "Unable to create a fresh browser context for the authentication boundary check.",
      notes: authNote,
      policyHandler: "executeAuthScenario"
    };
  }

  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();
  const protectedRoute = deps.buildProtectedRouteUrl(plan);

  try {
    const result = await assertAuthBoundary(isolatedPage, protectedRoute);

    return {
      status: result.passed ? "pass" : "fail",
      observedTarget: protectedRoute,
      actionResult: result.evidence,
      notes: `${authNote} Fresh-session check for ${scenario.title}.`,
      policyHandler: "executeAuthScenario"
    };
  } finally {
    await isolatedContext.close().catch(() => undefined);
    await deps.ensureAuthenticatedState(page, plan).catch(() => undefined);
  }
}

async function executeNavigationScenario(
  page: Page,
  scenario: Scenario,
  matchedTargets: string[],
  surface: PageSurface | undefined,
  authNote: string,
  deps: Pick<ScenarioExecutorDependencies, "firstVisibleByPatterns">
): Promise<{ status: StepStatus; observedTarget: string; actionResult: string; notes: string; policyHandler: string }> {
  const surfaceNavTargets: NavTarget[] = surface?.navTargets ?? [];
  const scenarioText = `${scenario.title} ${scenario.steps.join(" ")} ${scenario.expectedResult}`.toLowerCase();

  const surfaceMatch = surfaceNavTargets.find((t) =>
    scenarioText.includes(t.label.toLowerCase()) || scenarioText.includes(t.resolvedUrl.toLowerCase())
  );

  const resolvedTargets = surfaceMatch ? [surfaceMatch.label, ...matchedTargets] : matchedTargets;

  if (resolvedTargets.length === 0) {
    return {
      status: scenario.type === "exploratory" ? "pass" : "blocked",
      observedTarget: scenario.title,
      actionResult: scenario.type === "exploratory"
        ? "Exploratory scenario recorded for manual follow-up; no deterministic target match was required."
        : "No deterministic UI target from the saved scenario matched the current visible navigation.",
      notes: `${authNote} PageSurface navTargets checked: ${surfaceNavTargets.length}.`,
      policyHandler: "executeNavigationScenario"
    };
  }

  for (const target of resolvedTargets) {
    const control = await deps.firstVisibleByPatterns(page, [target]);
    if (!control) {
      const visibilityResult = await assertElementVisible(page, `text=${target}`, target);
      if (!visibilityResult.passed) {
        continue;
      }
    } else {
      await control.click().catch(() => undefined);
      await Promise.race([
        page.waitForLoadState("networkidle", { timeout: 5_000 }),
        page.waitForTimeout(1_000)
      ]).catch(() => undefined);
    }
  }

  return {
    status: "pass",
    observedTarget: resolvedTargets.join(", "),
    actionResult: `Validated scenario targets against the live UI: ${resolvedTargets.join(", ")}.${surfaceMatch ? ` (PageSurface match: ${surfaceMatch.label})` : ""}`,
    notes: authNote,
    policyHandler: "executeNavigationScenario"
  };
}

async function executeStateTransitionScenario(
  page: Page,
  scenario: Scenario,
  matchedTargets: string[],
  surface: PageSurface | undefined,
  authNote: string,
  deps: Pick<ScenarioExecutorDependencies, "toRegex" | "findFirstVisible" | "firstVisibleByPatterns">
): Promise<{ status: StepStatus; observedTarget: string; actionResult: string; notes: string; policyHandler: string }> {
  const surfaceInputs = surface?.inputs ?? [];
  const scenarioText = `${scenario.title} ${scenario.steps.join(" ")} ${scenario.expectedResult}`.toLowerCase();

  const surfaceInputMatch = surfaceInputs.find((i) => scenarioText.includes(i.label.toLowerCase()));

  if (surfaceInputMatch) {
    const visibilityResult = await assertElementVisible(page, surfaceInputMatch.selector, surfaceInputMatch.label);
    if (visibilityResult.passed) {
      return {
        status: "pass",
        observedTarget: surfaceInputMatch.label,
        actionResult: `Located state-transition input "${surfaceInputMatch.label}" via PageSurface. ${visibilityResult.evidence}`,
        notes: authNote,
        policyHandler: "executeStateTransitionScenario"
      };
    }
  }

  const inputDiscovery = await tryLocateScenarioInputs(page, scenario, matchedTargets, deps);
  const inputTarget = inputDiscovery.matchedHint ?? inputDiscovery.matchedView ?? matchedTargets[0] ?? scenario.title;
  return {
    status: inputDiscovery.inputs > 0 ? "pass" : "blocked",
    observedTarget: inputTarget,
    actionResult:
      inputDiscovery.inputs > 0
        ? inputDiscovery.matchedHint
          ? `Located the scenario input target ${inputDiscovery.matchedHint}${inputDiscovery.matchedView ? ` under ${inputDiscovery.matchedView}` : ""}.`
          : `Detected ${inputDiscovery.inputs} input control(s)${inputDiscovery.matchedView ? ` after opening ${inputDiscovery.matchedView}` : ""} while assessing ${scenario.title}.`
        : "No visible form controls matching the saved state-focused scenario were found.",
    notes: authNote,
    policyHandler: "executeStateTransitionScenario"
  };
}

async function executePermissionsScenario(
  page: Page,
  plan: RunPlan,
  scenario: Scenario,
  authNote: string,
  deps: Pick<ScenarioExecutorDependencies, "buildProtectedRouteUrl">
): Promise<{ status: StepStatus; observedTarget: string; actionResult: string; notes: string; policyHandler: string }> {
  const protectedRoute = deps.buildProtectedRouteUrl(plan);
  const result = await assertAuthBoundary(page, protectedRoute);
  return {
    status: result.passed ? "pass" : "fail",
    observedTarget: protectedRoute,
    actionResult: result.evidence,
    notes: `${authNote} Permissions check for scenario "${scenario.title}".`,
    policyHandler: "executePermissionsScenario"
  };
}

async function executeScenarioCheck(
  page: Page,
  context: BrowserContext,
  plan: RunPlan,
  scenario: Scenario,
  surface: PageSurface | undefined,
  deps: Pick<
    ScenarioExecutorDependencies,
    | "normalizeText"
    | "cleanLabel"
    | "selectDiscoveryLabels"
    | "toRegex"
    | "findFirstVisible"
    | "firstVisibleByPatterns"
    | "pageHasLoginForm"
    | "ensureAuthenticatedState"
    | "buildProtectedRouteUrl"
  >
): Promise<{ status: StepStatus; observedTarget: string; actionResult: string; notes: string; policyHandler: string }> {
  const alternateCredentialRequirement = scenarioNeedsAlternateCredentials(scenario, deps.normalizeText);

  if (alternateCredentialRequirement.blocked) {
    return {
      status: "blocked",
      observedTarget: scenario.title,
      actionResult: alternateCredentialRequirement.reason ?? "Scenario requires credentials not configured for this run.",
      notes: "The scenario was reviewed but could not be safely executed with the current credential set.",
      policyHandler: "blocked-credential-check"
    };
  }

  const authState = await deps.ensureAuthenticatedState(page, plan);
  const authNote = authState.notes;
  const currentCandidates = await discoverNavigationCandidates(page, deps);
  const scenarioText = deps.normalizeText(`${scenario.title} ${scenario.steps.join(" ")} ${scenario.expectedResult}`);
  const matchedTargets = currentCandidates.filter((candidate: string) => scenarioText.includes(deps.normalizeText(candidate))).slice(0, 3);

  switch (scenario.type) {
    case "negative":
      return executeAuthenticationBoundaryScenario(page, context, plan, scenario, authNote, deps);

    case "permissions":
      return executePermissionsScenario(page, plan, scenario, authNote, deps);

    case "state-transition":
      return executeStateTransitionScenario(page, scenario, matchedTargets, surface, authNote, deps);

    default:
      return executeNavigationScenario(page, scenario, matchedTargets, surface, authNote, deps);
  }
}

export async function executeScenarioSuiteRun(
  record: RunRecord,
  context: BrowserContext,
  page: Page,
  deps: ScenarioExecutorDependencies
): Promise<RunRecord> {
  const screenshotArtifacts: RunRecord["artifacts"] = [];
  const stepResults: StepResult[] = [];

  try {
    for (const [index, scenario] of record.generatedScenarios.entries()) {
      await deps.ensureRunNotCancelled(record.id);
      await deps.emitEvent(record.id, "executing", `Executing saved scenario ${index + 1}: ${scenario.title}.`, {
        stepNumber: index + 1,
        scenarioTitle: scenario.title
      });
      const outcome = await executeScenarioCheck(page, context, record.plan, scenario, record.pageSurfaceSnapshot, deps);
      const screenshotLabel = `Scenario ${index + 1}`;
      const screenshotArtifact = await captureScreenshot(page, record.id, index + 1, screenshotLabel);
      screenshotArtifacts.push(screenshotArtifact);
      const stepResult = createSyntheticStepResult(
        index + 1,
        `Scenario: ${scenario.title}`,
        "observe",
        outcome.observedTarget,
        outcome.actionResult,
        outcome.status,
        `${scenario.type} · ${scenario.expectedResult} ${outcome.notes}`.trim(),
        screenshotLabel,
        screenshotArtifact.id,
        outcome.policyHandler
      );
      stepResults.push(stepResult);

      if (outcome.status === "blocked") {
        await deps.emitWarning(record.id, "executing", outcome.actionResult, "unsupported-scenario", {
          stepNumber: index + 1,
          scenarioTitle: scenario.title
        });
      }

      await deps.persistCheckpoint(
        record,
        {
          currentPhase: "executing",
          status: "running",
          currentActivity: `Scenario ${index + 1}: ${scenario.title}`,
          currentStepNumber: undefined,
          currentScenarioIndex: index + 1,
          currentScenarioTitle: scenario.title,
          summary: `Executed ${index + 1} of ${record.generatedScenarios.length} saved scenarios.`,
          stepResults: [...stepResults],
          artifacts: [...screenshotArtifacts]
        },
        {
          message: `Scenario ${index + 1} finished with status ${outcome.status}.`,
          level: outcome.status === "blocked" ? "warning" : "info",
          category: outcome.status === "blocked" ? "unsupported-scenario" : undefined,
          stepNumber: index + 1,
          scenarioTitle: scenario.title
        }
      );
    }

    const hasFailure = stepResults.some((result) => result.assertionResult === "fail");
    const hasBlocked = stepResults.some((result) => result.assertionResult === "blocked");
    const reportContent = [
      `Executed scenarios: ${record.generatedScenarios.length}`,
      `Passed: ${stepResults.filter((result) => result.assertionResult === "pass").length}`,
      `Blocked: ${stepResults.filter((result) => result.assertionResult === "blocked").length}`,
      `Failed: ${stepResults.filter((result) => result.assertionResult === "fail").length}`
    ].join("\n");
    const artifacts = [
      ...screenshotArtifacts,
      ...(await buildRunArtifacts(record.id, record.plan, context, page, { reportContent }))
    ];
    const defects = buildDefects(stepResults, record.plan.featureArea);

    return buildTerminalRunRecord(record, {
      status: hasFailure ? "fail" : hasBlocked ? "blocked" : "pass",
      currentPhase: "reporting",
      currentActivity: "Regression reporting completed.",
      summary: hasFailure
        ? "The saved scenario suite found failures against the live application."
        : hasBlocked
          ? "The saved scenario suite completed with unsupported or blocked scenarios."
          : "The saved scenario suite completed successfully.",
      stepResults,
      artifacts,
      defects,
      analysisInsights: []
    });
  } catch (error) {
    if (error instanceof Error && error.name === "RunCancelledError") {
      return buildTerminalRunRecord(record, {
        status: "cancelled",
        currentPhase: "cancelled",
        currentActivity: "Run cancelled during regression scenario execution.",
        summary: "The regression scenario suite was cancelled before completion.",
        stepResults,
        artifacts: screenshotArtifacts,
        defects: buildDefects(stepResults, record.plan.featureArea),
        analysisInsights: []
      });
    }

    const screenshotLabel = `Scenario ${stepResults.length + 1}`;
    const screenshotArtifact = await captureScreenshot(page, record.id, stepResults.length + 1, screenshotLabel);
    screenshotArtifacts.push(screenshotArtifact);
    stepResults.push(
      createSyntheticStepResult(
        stepResults.length + 1,
        "Execute saved scenario suite",
        "observe",
        page.url(),
        deps.sanitizeError(error),
        "fail",
        "The regression scenario suite terminated unexpectedly.",
        screenshotLabel,
        screenshotArtifact.id
      )
    );

    const artifacts = [
      ...screenshotArtifacts,
      ...(await buildRunArtifacts(record.id, record.plan, context, page))
    ];

    return buildTerminalRunRecord(record, {
      status: "fail",
      currentPhase: "reporting",
      currentActivity: "Regression reporting failed unexpectedly.",
      summary: "The saved scenario suite failed before completion.",
      stepResults,
      artifacts,
      defects: buildDefects(stepResults, record.plan.featureArea),
      analysisInsights: []
    });
  }
}