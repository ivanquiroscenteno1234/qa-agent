import type { BrowserContext, Locator, Page } from "playwright";

import { buildQaInsights } from "@/lib/qa/analysis-engine";
import { runLlmReviewAnalysis } from "@/lib/qa/llm/review-analysis";
import { buildAnalysisReport, buildManualTestPlan, buildRunArtifacts, captureScreenshot } from "@/lib/qa/artifact-builder";
import { hasCredentialSource, type AuthStateOutcome } from "@/lib/qa/auth-session";
import type { CrawlSnapshot, CrawlView } from "@/lib/qa/crawl-model";
import { buildPageSurface } from "@/lib/qa/crawl-model";
import { discoverNavigationCandidates } from "@/lib/qa/navigation-discovery";
import { buildTerminalRunRecord } from "@/lib/qa/result-builder";
import { generateScenariosWithLlm } from "@/lib/qa/scenario-generator";
import type {
  DefectCandidate,
  ParsedStep,
  RunPlan,
  RunRecord,
  StepResult,
  StepStatus
} from "@/lib/types";
import { createId } from "@/lib/qa/utils";

type ExecutionOutcome = { observedTarget: string; actionResult: string; notes: string };

interface DiscoveryEngineDependencies {
  normalizeText: (value: string) => string;
  cleanLabel: (value: string) => string;
  selectDiscoveryLabels: (values: string[], limit: number) => string[];
  firstVisibleByPatterns: (page: Page, patterns: string[]) => Promise<Locator | null>;
  pageHasLoginForm: (page: Page) => Promise<boolean>;
  ensureAuthenticatedState: (page: Page, plan: RunPlan) => Promise<AuthStateOutcome>;
  executeNavigate: (page: Page, step: ParsedStep, plan: RunPlan) => Promise<ExecutionOutcome>;
  executeLogin: (page: Page, parsedSteps: ParsedStep[], plan: RunPlan) => Promise<ExecutionOutcome>;
  createSyntheticStepResult: (
    stepNumber: number,
    userStepText: string,
    normalizedAction: ParsedStep["actionType"],
    observedTarget: string,
    actionResult: string,
    assertionResult: StepStatus,
    notes: string,
    screenshotLabel: string,
    screenshotArtifactId?: string
  ) => StepResult;
  ensureRunNotCancelled: (runId: string) => Promise<void>;
  emitEvent: (runId: string, phase: RunRecord["currentPhase"], message: string) => Promise<void>;
  persistCheckpoint: (record: RunRecord, patch: Partial<RunRecord>) => Promise<void>;
}

function fingerprintView(view: CrawlView, normalizeText: DiscoveryEngineDependencies["normalizeText"]): string {
  return JSON.stringify({
    title: normalizeText(view.title),
    headings: view.headings.slice(0, 4).map((value) => normalizeText(value)),
    buttons: view.buttons.slice(0, 8).map((value) => normalizeText(value)),
    inputs: view.inputs.slice(0, 4).map((input) => normalizeText(input.ariaLabel || input.placeholder || input.name || input.type || input.tag))
  });
}

function collectSubviewCandidates(view: CrawlView, deps: Pick<DiscoveryEngineDependencies, "selectDiscoveryLabels" | "normalizeText">): string[] {
  return deps
    .selectDiscoveryLabels([...view.headings, ...view.buttons, ...view.links], 5)
    .filter((label) => deps.normalizeText(label) !== deps.normalizeText(view.label));
}

async function capturePageSnapshot(page: Page, label: string): Promise<CrawlView> {
  return page.evaluate((currentLabel) => {
    const textList = (selector: string, limit: number) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter(Boolean)
        .slice(0, limit);

    return {
      label: currentLabel,
      depth: 0,
      title: document.title,
      url: location.href,
      headings: textList("h1, h2, h3, h4", 20),
      buttons: textList("button", 30),
      links: textList("a", 20),
      inputs: Array.from(document.querySelectorAll("input, textarea, select"))
        .map((element) => {
          const input = element as HTMLInputElement;
          return {
            tag: element.tagName.toLowerCase(),
            name: input.name || "",
            type: input.type || "",
            placeholder: input.placeholder || "",
            ariaLabel: input.getAttribute("aria-label") || ""
          };
        })
        .slice(0, 20)
    };
  }, label);
}

async function dismissTransientOverlays(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(100).catch(() => undefined);
}

async function collectDeepDiscoveryCrawl(page: Page, plan: RunPlan, deps: Pick<DiscoveryEngineDependencies, "normalizeText" | "selectDiscoveryLabels" | "firstVisibleByPatterns" | "cleanLabel">): Promise<string> {
  const navigationCandidates = await discoverNavigationCandidates(page, deps);
  const visitedViews: CrawlView[] = [];
  const visitedLabels = new Set<string>();
  const startedAt = Date.now();
  const maxDepth = 2;
  const maxVisitedViews = Math.min(Math.max(plan.timeboxMinutes, 6), 12);
  const explorationBudgetMs = Math.min(Math.max(plan.timeboxMinutes * 4_000, 25_000), 90_000);
  const landingView = await capturePageSnapshot(page, "Landing");

  visitedViews.push(landingView);
  visitedLabels.add(deps.normalizeText("Landing"));

  const queue = navigationCandidates.map((label) => ({ label, depth: 1, parentLabel: "Landing" }));
  const queuedLabels = new Set(navigationCandidates.map((label) => deps.normalizeText(label)));

  while (queue.length > 0 && visitedViews.length < maxVisitedViews && Date.now() - startedAt < explorationBudgetMs) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const normalizedLabel = deps.normalizeText(current.label);
    queuedLabels.delete(normalizedLabel);

    if (visitedLabels.has(normalizedLabel)) {
      continue;
    }

    const target = await deps.firstVisibleByPatterns(page, [current.label]);
    if (!target) {
      continue;
    }

    await dismissTransientOverlays(page);
    await target.click().catch(() => undefined);
    await Promise.race([
      page.waitForLoadState("networkidle", { timeout: 5_000 }),
      page.waitForTimeout(1_200)
    ]).catch(() => undefined);

    const snapshot = await capturePageSnapshot(page, current.label);
    snapshot.depth = current.depth;
    snapshot.parentLabel = current.parentLabel;
    visitedViews.push(snapshot);
    visitedLabels.add(normalizedLabel);

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const childLabel of collectSubviewCandidates(snapshot, deps)) {
      const normalizedChild = deps.normalizeText(childLabel);
      if (visitedLabels.has(normalizedChild) || queuedLabels.has(normalizedChild)) {
        continue;
      }

      queuedLabels.add(normalizedChild);
      queue.push({ label: childLabel, depth: current.depth + 1, parentLabel: current.label });
    }
  }

  const aggregate: CrawlSnapshot = {
    title: visitedViews[visitedViews.length - 1]?.title ?? (await page.title()),
    url: page.url(),
    navigationCandidates,
    visitedViews,
    headings: visitedViews.flatMap((view) => view.headings).slice(0, 30),
    buttons: visitedViews.flatMap((view) => view.buttons).slice(0, 60),
    links: visitedViews.flatMap((view) => view.links).slice(0, 40),
    inputs: visitedViews.flatMap((view) => view.inputs).slice(0, 30)
  };

  return JSON.stringify(aggregate, null, 2);
}

function parseCrawlSnapshot(content: string): CrawlSnapshot | null {
  try {
    return JSON.parse(content) as CrawlSnapshot;
  } catch {
    return null;
  }
}

function summarizeDiscovery(snapshot: CrawlSnapshot | null, deps: Pick<DiscoveryEngineDependencies, "cleanLabel" | "selectDiscoveryLabels">): string[] {
  if (!snapshot) {
    return [];
  }

  const visibleLabels = [
    ...(snapshot.navigationCandidates ?? []),
    ...((snapshot.visitedViews ?? []).map((view) => view.label)),
    ...(snapshot.headings ?? []),
    ...(snapshot.buttons ?? []),
    ...(snapshot.links ?? [])
  ]
    .map((value) => deps.cleanLabel(value))
    .filter(Boolean);

  return deps.selectDiscoveryLabels(visibleLabels, 6);
}

function buildDiscoveryDefects(
  crawlSnapshot: CrawlSnapshot | null,
  plan: RunPlan,
  deps: Pick<DiscoveryEngineDependencies, "normalizeText">
): DefectCandidate[] {
  if (!crawlSnapshot) {
    return [];
  }

  const defects: DefectCandidate[] = [];
  const visitedViews = crawlSnapshot.visitedViews ?? [];
  const landingFingerprint = visitedViews[0] ? fingerprintView(visitedViews[0], deps.normalizeText) : "";

  for (const view of visitedViews.slice(1)) {
    if (landingFingerprint && fingerprintView(view, deps.normalizeText) === landingFingerprint) {
      defects.push({
        id: createId("defect"),
        title: `${plan.featureArea}: ${view.label} may not expose distinct content`,
        severity: "low",
        priority: "P2",
        expectedResult: `${view.label} should reveal content distinct from the landing view.`,
        actualResult: `${view.label} produced a surface snapshot indistinguishable from the landing view.`,
        stepsToReproduce: [`Open ${plan.targetUrl}.`, `Authenticate if needed.`, `Open ${view.label}.`],
        confidence: 0.58
      });
    }
  }

  for (const input of crawlSnapshot.inputs ?? []) {
    const inputLabel = input.ariaLabel || input.name || input.placeholder || input.type || input.tag || "input";
    if (!input.ariaLabel && !input.name && input.placeholder) {
      defects.push({
        id: createId("defect"),
        title: `${plan.featureArea}: ${inputLabel} relies on placeholder text only`,
        severity: "low",
        priority: "P2",
        expectedResult: "Inputs should expose a stable accessible label or name in addition to placeholder guidance.",
        actualResult: `${inputLabel} was discovered without an accessible label or input name.`,
        stepsToReproduce: [`Open ${plan.targetUrl}.`, "Navigate to the discovered form surface.", `Inspect the input with placeholder \"${input.placeholder}\".`],
        confidence: 0.72
      });
    }
  }

  return defects;
}

export async function executeDiscoveryRun(
  record: RunRecord,
  context: BrowserContext,
  page: Page,
  deps: DiscoveryEngineDependencies
): Promise<RunRecord> {
  const screenshotArtifacts = [] as RunRecord["artifacts"];
  const stepResults = [] as RunRecord["stepResults"];
  let crawlContent = "";

  try {
    await deps.ensureRunNotCancelled(record.id);
    await deps.emitEvent(record.id, "executing", "Starting exploratory discovery run.");
    const navigation = await deps.executeNavigate(
      page,
      {
        id: createId("step"),
        rawText: `Open ${record.plan.targetUrl}`,
        actionType: "navigate",
        targetDescription: record.plan.targetUrl,
        fallbackInterpretation: "Navigate to the configured target URL.",
        riskClassification: "low"
      },
      record.plan
    );

    const firstScreenshotArtifact = await captureScreenshot(page, record.id, 1, "Discovery Step 1");
    screenshotArtifacts.push(firstScreenshotArtifact);
    stepResults.push(
      deps.createSyntheticStepResult(
        1,
        `Open ${record.plan.targetUrl}`,
        "navigate",
        navigation.observedTarget,
        navigation.actionResult,
        "pass",
        navigation.notes,
        "Discovery Step 1",
        firstScreenshotArtifact.id
      )
    );

    await deps.persistCheckpoint(record, {
      currentPhase: "executing",
      status: "running",
      currentActivity: `Discovery step 1: navigate to ${record.plan.targetUrl}`,
      currentStepNumber: 1,
      currentScenarioIndex: undefined,
      currentScenarioTitle: undefined,
      summary: "Discovery navigation completed. Preparing authentication and crawl.",
      stepResults: [...stepResults],
      artifacts: [...screenshotArtifacts]
    });

    await deps.ensureRunNotCancelled(record.id);
    if (hasCredentialSource(record.plan)) {
      try {
        const authState = await deps.ensureAuthenticatedState(page, record.plan);
        if (authState.authenticatedViaLogin) {
          const loginStepNumber = stepResults.length + 1;
          const loginScreenshotArtifact = await captureScreenshot(page, record.id, loginStepNumber, `Discovery Step ${loginStepNumber}`);
          screenshotArtifacts.push(loginScreenshotArtifact);
          stepResults.push(
            deps.createSyntheticStepResult(
              loginStepNumber,
              "Authenticate with the supplied discovery credentials.",
              "login",
              authState.observedTarget,
              "Authenticated with the supplied discovery credentials.",
              "pass",
              authState.notes,
              `Discovery Step ${loginStepNumber}`,
              loginScreenshotArtifact.id
            )
          );

          await deps.persistCheckpoint(record, {
            currentPhase: "executing",
            status: "running",
            currentActivity: "Authenticating with discovery credentials.",
            currentStepNumber: loginStepNumber,
            currentScenarioIndex: undefined,
            currentScenarioTitle: undefined,
            summary: "Discovery authentication completed. Preparing deep crawl.",
            stepResults: [...stepResults],
            artifacts: [...screenshotArtifacts]
          });
        }
      } catch (error) {
        const loginStepNumber = stepResults.length + 1;
        const loginScreenshotArtifact = await captureScreenshot(page, record.id, loginStepNumber, `Discovery Step ${loginStepNumber}`);
        screenshotArtifacts.push(loginScreenshotArtifact);
        stepResults.push(
          deps.createSyntheticStepResult(
            loginStepNumber,
            "Authenticate with the supplied discovery credentials.",
            "login",
            page.url(),
            error instanceof Error ? error.message : "Automated authentication failed.",
            "fail",
            "The exploratory run could not establish an authenticated session before crawling.",
            `Discovery Step ${loginStepNumber}`,
            loginScreenshotArtifact.id
          )
        );
        throw error;
      }
    }

    crawlContent = await collectDeepDiscoveryCrawl(page, record.plan, deps);
    const crawlSnapshot = parseCrawlSnapshot(crawlContent);
    const pageSurface = crawlSnapshot ? buildPageSurface(crawlSnapshot) : undefined;
    const discoverySurface = summarizeDiscovery(crawlSnapshot, deps);
    const scenarioSet = await generateScenariosWithLlm(record.plan, { crawlContent });
    const discoveryDefects = buildDiscoveryDefects(crawlSnapshot, record.plan, deps);
    const heuristicInsights = buildQaInsights({
      stepResults,
      artifacts: screenshotArtifacts,
      warnings: [],
      crawlSurface: pageSurface,
      crawlSnapshot: crawlSnapshot ?? undefined,
      defects: discoveryDefects,
      discoverySurface,
      plan: record.plan
    });
    const heuristicInsightsAnnotated = heuristicInsights.map((i) => ({ ...i, analysisSource: "heuristic" as const }));
    const llmInsights = await runLlmReviewAnalysis({
      featureArea: record.plan.featureArea,
      mode: record.plan.mode,
      stepResults,
      warnings: [],
      artifacts: screenshotArtifacts,
      discoverySurface
    });
    const analysisInsights = [...heuristicInsightsAnnotated, ...llmInsights];
    const crawlStepNumber = stepResults.length + 1;

    const crawlScreenshotArtifact = await captureScreenshot(page, record.id, crawlStepNumber, `Discovery Step ${crawlStepNumber}`);
    screenshotArtifacts.push(crawlScreenshotArtifact);
    stepResults.push(
      deps.createSyntheticStepResult(
        crawlStepNumber,
        "Crawl the current application surface and derive suggested manual tests.",
        "observe",
        crawlSnapshot?.url ?? page.url(),
        `Captured ${Math.max(discoverySurface.length, 1)} discovery signal(s) from the reachable UI.`,
        "pass",
        discoverySurface.length
          ? `Observed: ${discoverySurface.join(", ")}.`
          : "The crawl completed, but the surface summary was sparse. Review the crawl artifact directly.",
        `Discovery Step ${crawlStepNumber}`,
        crawlScreenshotArtifact.id
      )
    );

    await deps.persistCheckpoint(record, {
      currentPhase: "reporting",
      status: "running",
      currentActivity: "Building discovery reports and artifacts.",
      currentStepNumber: crawlStepNumber,
      currentScenarioIndex: undefined,
      currentScenarioTitle: undefined,
      summary: "Discovery crawl completed. Building reports and artifacts.",
      stepResults: [...stepResults],
      artifacts: [...screenshotArtifacts]
    });

    const reportContent = [
      `Environment: ${record.plan.environment}`,
      `Feature: ${record.plan.featureArea}`,
      `Risk: ${record.plan.riskLevel}`,
      `URL: ${page.url()}`,
      `Visited views: ${(crawlSnapshot?.visitedViews ?? []).length}`,
      `Top discovery labels: ${discoverySurface.join(", ") || "none"}`
    ].join("\n");
    const manualTestPlanContent = buildManualTestPlan(record.plan, crawlSnapshot, discoverySurface, scenarioSet.scenarios);
    const analysisReportContent = buildAnalysisReport(analysisInsights);

    const artifacts = [
      ...screenshotArtifacts,
      ...(await buildRunArtifacts(record.id, record.plan, context, page, {
        crawlContent,
        reportContent,
        manualTestPlanContent,
        analysisReportContent
      }))
    ];

    return buildTerminalRunRecord(
      {
        ...record,
        generatedScenarios: scenarioSet.scenarios,
        riskSummary: scenarioSet.riskSummary,
        coverageGaps: scenarioSet.coverageGaps,
        pageSurfaceSnapshot: pageSurface
      },
      {
        status: "pass",
        currentPhase: "reporting",
        currentActivity: "Discovery reporting completed.",
        summary: "The exploratory discovery run crawled the reachable UI and proposed manual tests based on the observed surface.",
        stepResults,
        artifacts,
        defects: discoveryDefects,
        analysisInsights
      }
    );
  } catch (error) {
    const isCancellation = error instanceof Error && error.name === "RunCancelledError";

    if (isCancellation) {
      return buildTerminalRunRecord(record, {
        status: "cancelled",
        currentPhase: "cancelled",
        currentActivity: "Run cancelled during exploratory discovery.",
        summary: "The exploratory discovery run was cancelled before completion.",
        stepResults,
        artifacts: screenshotArtifacts,
        defects: [],
        analysisInsights: []
      });
    }

    const screenshotLabel = `Discovery Step ${stepResults.length + 1}`;
    const failureScreenshotArtifact = await captureScreenshot(page, record.id, stepResults.length + 1, screenshotLabel);
    screenshotArtifacts.push(failureScreenshotArtifact);
    stepResults.push(
      deps.createSyntheticStepResult(
        stepResults.length + 1,
        "Run discovery crawl",
        "observe",
        page.url(),
        error instanceof Error ? error.message : "Unknown execution error",
        "fail",
        "The exploratory crawl could not complete.",
        screenshotLabel,
        failureScreenshotArtifact.id
      )
    );

    const artifacts = [
      ...screenshotArtifacts,
      ...(await buildRunArtifacts(record.id, record.plan, context, page, { crawlContent }))
    ];

    return buildTerminalRunRecord(record, {
      status: "fail",
      currentPhase: "reporting",
      currentActivity: "Discovery reporting failed unexpectedly.",
      summary: "The exploratory discovery run failed before it could complete the crawl.",
      stepResults,
      artifacts,
      defects: [],
      analysisInsights: []
    });
  }
}