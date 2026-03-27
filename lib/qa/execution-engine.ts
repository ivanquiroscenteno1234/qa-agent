import type { BrowserContext, Locator, Page } from "playwright";

import { buildRunArtifacts, captureScreenshot } from "@/lib/qa/artifact-builder";
import {
  type AuthStateOutcome,
  buildProtectedRouteUrl as buildProtectedRouteUrlRuntime,
  ensureAuthenticatedState as ensureAuthenticatedStateRuntime,
  pageHasLoginForm as pageHasLoginFormRuntime,
  resolveCredentials as resolveCredentialsRuntime
} from "@/lib/qa/auth-session";
import {
  dismissEditDialog as dismissEditDialogRuntime,
  executeEditableAssertion as executeEditableAssertionRuntime,
  executeLogin as executeLoginRuntime,
  executeNavigate as executeNavigateRuntime,
  executeOpenNavigation as executeOpenNavigationRuntime,
  executeOpenSection as executeOpenSectionRuntime,
  findFirstVisible as findFirstVisibleRuntime,
  firstVisibleByPatterns as firstVisibleByPatternsRuntime,
  resolveBrowser as resolveBrowserRuntime,
  runStep as runStepRuntime
} from "@/lib/qa/browser-runtime";
import { executeDiscoveryRun as runDiscoveryFlow } from "@/lib/qa/discovery-engine";
import { buildDefects, buildStepResult, buildTerminalRunRecord, createSyntheticStepResult } from "@/lib/qa/result-builder";
import {
  emitEvent,
  emitWarning,
  ensureRunNotCancelled,
  isCancellationError,
  persistCheckpoint
} from "@/lib/qa/runtime-coordinator";
import { executeScenarioSuiteRun as runScenarioSuiteFlow } from "@/lib/qa/scenario-executor";
import { generateScenarios } from "@/lib/qa/scenario-generator";
import { cleanLabel, expandedTerms, normalizeText, selectDiscoveryLabels, toRegex } from "@/lib/qa/text-runtime";
import { updateRunState } from "@/lib/qa/store";
import type { Artifact, DefectCandidate, ParsedStep, RunPlan, RunRecord, StepResult, StepStatus } from "@/lib/types";

function resolveBrowser(browserName: string) {
  return resolveBrowserRuntime(browserName, normalizeText);
}

async function findFirstVisible(locator: Locator): Promise<Locator | null> {
  return findFirstVisibleRuntime(locator);
}

async function firstVisibleByPatterns(page: Page, patterns: string[]): Promise<Locator | null> {
  return firstVisibleByPatternsRuntime(page, patterns, { expandedTerms, normalizeText, toRegex });
}

async function resolveCredentials(plan: RunPlan, parsedSteps: ParsedStep[]): Promise<{ email: string; password: string }> {
  return resolveCredentialsRuntime(plan, parsedSteps);
}

async function dismissEditDialog(page: Page): Promise<void> {
  await dismissEditDialogRuntime(page, async (currentPage, patterns) => firstVisibleByPatterns(currentPage, patterns));
}

async function pageHasLoginForm(page: Page): Promise<boolean> {
  return pageHasLoginFormRuntime(page, { findFirstVisible });
}

async function executeNavigate(page: Page, step: ParsedStep, plan: RunPlan): Promise<{ observedTarget: string; actionResult: string; notes: string }> {
  return executeNavigateRuntime(page, step, plan);
}

async function executeLogin(page: Page, parsedSteps: ParsedStep[], plan: RunPlan): Promise<{ observedTarget: string; actionResult: string; notes: string }> {
  return executeLoginRuntime(page, parsedSteps, plan, { findFirstVisible, resolveCredentials });
}

async function executeOpenNavigation(page: Page, step: ParsedStep): Promise<{ observedTarget: string; actionResult: string; notes: string }> {
  return executeOpenNavigationRuntime(page, step, { firstVisibleByPatterns, normalizeText });
}

async function executeOpenSection(page: Page, step: ParsedStep): Promise<{ observedTarget: string; actionResult: string; notes: string }> {
  return executeOpenSectionRuntime(page, step, { firstVisibleByPatterns });
}

async function executeEditableAssertion(
  page: Page,
  parsedSteps: ParsedStep[],
  step: ParsedStep,
  plan: RunPlan
): Promise<{ observedTarget: string; actionResult: string; notes: string }> {
  return executeEditableAssertionRuntime(page, parsedSteps, step, plan, { firstVisibleByPatterns, findFirstVisible, dismissEditDialog });
}

async function runStep(page: Page, parsedSteps: ParsedStep[], plan: RunPlan, step: ParsedStep): Promise<{ observedTarget: string; actionResult: string; notes: string }> {
  return runStepRuntime(page, parsedSteps, plan, step, {
    executeNavigate,
    executeLogin,
    executeOpenNavigation,
    executeOpenSection,
    executeEditableAssertion,
    pageHasLoginForm,
    firstVisibleByPatterns
  });
}

function sanitizeError(error: unknown): string {
  const redact = (value: string) => value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/password\s*[:=]?\s*[^\s]+/gi, "password [REDACTED]")
    .replace(/token\s*[:=]?\s*[^\s]+/gi, "token [REDACTED]")
    .replace(/apikey\s*[:=]?\s*[^\s]+/gi, "apikey [REDACTED]")
    .replace(/zxcvFDSAqwer1234@/g, "[REDACTED_SECRET]");

  if (error instanceof Error) {
    return redact(error.message);
  }

  if (typeof error === "string") {
    return redact(error);
  }

  return "Unknown execution error";
}

async function ensureAuthenticatedState(page: Page, plan: RunPlan): Promise<AuthStateOutcome> {
  return ensureAuthenticatedStateRuntime(page, plan, { findFirstVisible, executeLogin });
}

function buildProtectedRouteUrl(plan: RunPlan): string {
  return buildProtectedRouteUrlRuntime(plan);
}

async function executeScenarioSuiteRun(record: RunRecord, context: BrowserContext, page: Page): Promise<RunRecord> {
  return runScenarioSuiteFlow(record, context, page, {
    normalizeText,
    cleanLabel,
    selectDiscoveryLabels,
    toRegex,
    firstVisibleByPatterns,
    findFirstVisible,
    pageHasLoginForm,
    ensureAuthenticatedState,
    buildProtectedRouteUrl,
    ensureRunNotCancelled,
    emitEvent,
    emitWarning,
    persistCheckpoint,
    sanitizeError
  });
}

async function executeDiscoveryRun(record: RunRecord, context: BrowserContext, page: Page): Promise<RunRecord> {
  return runDiscoveryFlow(record, context, page, {
    normalizeText,
    cleanLabel,
    selectDiscoveryLabels,
    firstVisibleByPatterns,
    pageHasLoginForm,
    ensureAuthenticatedState,
    executeNavigate,
    executeLogin,
    createSyntheticStepResult,
    ensureRunNotCancelled,
    emitEvent: async (runId, phase, message) => {
      await emitEvent(runId, phase, message);
    },
    persistCheckpoint: async (currentRecord, patch) => {
      await persistCheckpoint(currentRecord, patch);
    }
  });
}

export async function executeRun(record: RunRecord): Promise<RunRecord> {
  await emitEvent(record.id, "preparing", `Launching ${record.plan.browser} in ${record.plan.headless ? "headless" : "visible"} mode.`);
  const browserType = resolveBrowser(record.plan.browser);
  const browser = await browserType.launch({ headless: record.plan.headless });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();
  const screenshotArtifacts: Artifact[] = [];
  const stepResults: StepResult[] = [];

  await context.tracing.start({ screenshots: true, snapshots: true });
  await updateRunState(record.id, {
    status: "running",
    currentPhase: "executing",
    startedAt: record.startedAt ?? new Date().toISOString(),
    currentActivity: `Launching ${record.plan.browser} browser runtime.`,
    currentStepNumber: undefined,
    currentScenarioIndex: undefined,
    currentScenarioTitle: undefined,
    summary: "Run is executing in the browser.",
    updatedAt: new Date().toISOString()
  });

  try {
    if (record.plan.mode === "exploratory-session" && record.parsedSteps.length === 0) {
      return await executeDiscoveryRun(record, context, page);
    }

    if (record.plan.mode === "regression-run" && record.generatedScenarios.length > 0) {
      return await executeScenarioSuiteRun(record, context, page);
    }

    for (const [index, step] of record.parsedSteps.entries()) {
      await ensureRunNotCancelled(record.id);
      await emitEvent(record.id, "executing", `Executing step ${index + 1}: ${step.rawText}.`, {
        stepNumber: index + 1
      });
      let assertionResult: StepStatus = "pass";
      let actionResult = "";
      let notes = "";
      let observedTarget = step.targetDescription;

      try {
        const executed = await runStep(page, record.parsedSteps, record.plan, step);
        observedTarget = executed.observedTarget;
        actionResult = executed.actionResult;
        notes = executed.notes;
      } catch (error) {
        assertionResult = "fail";
        actionResult = sanitizeError(error);
        notes = `The live browser executor could not complete ${step.actionType}.`;
      }

      const screenshotLabel = `Step ${index + 1}`;
      const screenshotArtifact = await captureScreenshot(page, record.id, index + 1, screenshotLabel);
      screenshotArtifacts.push(screenshotArtifact);

      stepResults.push(
        buildStepResult(step, index + 1, observedTarget, actionResult, assertionResult, notes, screenshotLabel, screenshotArtifact.id)
      );

      if (assertionResult !== "pass") {
        await emitWarning(
          record.id,
          "executing",
          actionResult,
          "assertion-failed",
          { stepNumber: index + 1, recoverable: false }
        );
      }

      const checkpointLevel = assertionResult === "pass" ? "info" : "error";
      const checkpointCategory = assertionResult === "fail" ? "assertion-failed" : undefined;

      await persistCheckpoint(
        record,
        {
          currentPhase: "executing",
          status: "running",
          currentActivity: `Step ${index + 1}: ${step.rawText}`,
          currentStepNumber: index + 1,
          currentScenarioIndex: undefined,
          currentScenarioTitle: undefined,
          summary: `Executed ${index + 1} of ${record.parsedSteps.length} steps.`,
          stepResults: [...stepResults],
          artifacts: [...screenshotArtifacts]
        },
        {
          message: `Step ${index + 1} finished with status ${assertionResult}.`,
          level: checkpointLevel,
          category: checkpointCategory,
          stepNumber: index + 1
        }
      );

      if (assertionResult === "fail") {
        break;
      }
    }

    const trailingArtifacts = await buildRunArtifacts(record.id, record.plan, context, page);
    const artifacts = [...screenshotArtifacts, ...trailingArtifacts];
    const defects = buildDefects(stepResults, record.plan.featureArea);
    const hasFailure = stepResults.some((result) => result.assertionResult === "fail");
    const hasBlocked = stepResults.some((result) => result.assertionResult === "blocked");

    return buildTerminalRunRecord(record, {
      status: hasFailure ? "fail" : hasBlocked ? "blocked" : "pass",
      currentPhase: "reporting",
      currentActivity: "Step execution reporting completed.",
      summary: hasFailure
        ? "The live browser run found failures against the target application."
        : hasBlocked
          ? "The live browser run completed with blockers."
          : "The live browser run completed successfully.",
      stepResults,
      artifacts,
      defects,
      analysisInsights: []
    });
  } catch (error) {
    if (isCancellationError(error)) {
      return buildTerminalRunRecord(record, {
        status: "cancelled",
        currentPhase: "cancelled",
        currentActivity: "Run cancelled during step execution.",
        summary: "The live browser run was cancelled before completion.",
        stepResults,
        artifacts: screenshotArtifacts,
        defects: buildDefects(stepResults, record.plan.featureArea),
        analysisInsights: []
      });
    }

    throw error;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}