import type { BrowserContext, Locator, Page } from "playwright";

import { buildAnalysisReport, buildManualTestPlan, buildRunArtifacts, captureScreenshot } from "@/lib/qa/artifact-builder";
import { hasCredentialSource, type AuthStateOutcome } from "@/lib/qa/auth-session";
import type { CrawlSnapshot, CrawlView } from "@/lib/qa/crawl-model";
import { discoverNavigationCandidates } from "@/lib/qa/navigation-discovery";
import { generateScenarios } from "@/lib/qa/scenario-generator";
import type {
  AnalysisEvidenceReference,
  AnalysisInsight,
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

  while (queue.length > 0 && visitedViews.length < maxVisitedViews && Date.now() - startedAt < explorationBudgetMs) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const normalizedLabel = deps.normalizeText(current.label);
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
      if (visitedLabels.has(normalizedChild) || queue.some((item) => deps.normalizeText(item.label) === normalizedChild)) {
        continue;
      }

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

function buildAnalysisInsights(
  crawlSnapshot: CrawlSnapshot | null,
  discoverySurface: string[],
  defects: DefectCandidate[],
  plan: RunPlan
): AnalysisInsight[] {
  if (!crawlSnapshot) {
    return [];
  }

  const insights: AnalysisInsight[] = [];
  const combinedText = `${discoverySurface.join(" ")} ${(crawlSnapshot.buttons ?? []).join(" ")}`;
  const hasSpanish = /men[uú]|configuraci[oó]n|art[ií]culos|gesti[oó]n|anal[ií]tica/i.test(combinedText);
  const hasEnglish = /bundle|combo|menu|edit|pause|settings|panel/i.test(combinedText);
  const visitedViews = crawlSnapshot.visitedViews ?? [];
  const surfacedLabels = discoverySurface.slice(0, 4);
  const placeholderOnlyDefect = defects.find((defect) => /placeholder text only/i.test(defect.title));
  const indistinctNavigationDefect = defects.find((defect) => /may not expose distinct content/i.test(defect.title));
  const unlabeledInput = visitedViews.flatMap((view) => view.inputs ?? []).find((input) => input.placeholder || input.ariaLabel || input.type || input.tag);

  const evidenceFrom = (...items: Array<AnalysisEvidenceReference | null | undefined>): AnalysisEvidenceReference[] =>
    items.filter((item): item is AnalysisEvidenceReference => Boolean(item));

  if (discoverySurface.some((item) => /men[uú]|gesti[oó]n de men[uú]|art[ií]culos del men[uú]/i.test(item))) {
    insights.push({
      id: createId("analysis"),
      category: "intended-flow",
      title: "Likely intended pass flow: menu management",
      summary: "The discovered navigation suggests restaurant partners are expected to reach menu management, review categories, and manage menu items successfully.",
      recommendation: "Ensure menu views, category editing, item creation, and save feedback remain visible and distinct for operators.",
      confidence: 0.83,
      evidence: evidenceFrom(
        { type: "surface", label: surfacedLabels.find((item) => /men[uú]|gesti[oó]n de men[uú]|art[ií]culos del men[uú]/i.test(item)) ?? "Menu-related surface discovered" },
        visitedViews.find((view) => /men[uú]/i.test(view.label)) ? { type: "view", label: visitedViews.find((view) => /men[uú]/i.test(view.label))?.label ?? "Menú" } : null,
        { type: "artifact", label: "Page Crawl" }
      )
    });
  }

  if (discoverySurface.some((item) => /combos|promos|bundle/i.test(item))) {
    insights.push({
      id: createId("analysis"),
      category: "intended-flow",
      title: "Likely intended pass flow: combos and promotions",
      summary: "The product appears to support combo and promotion management as a first-class restaurant workflow.",
      recommendation: "The dev team should verify that list, create, edit, pause, and resume states for combos all produce clear, distinct UI transitions.",
      confidence: 0.79,
      evidence: evidenceFrom(
        { type: "surface", label: surfacedLabels.find((item) => /combos|promos|bundle/i.test(item)) ?? "Combos or promos surface discovered" },
        visitedViews.find((view) => /combos|promos|bundle/i.test(view.label)) ? { type: "view", label: visitedViews.find((view) => /combos|promos|bundle/i.test(view.label))?.label ?? "Combos & promos" } : null,
        { type: "artifact", label: "Page Crawl" }
      )
    });
  }

  if (hasSpanish && hasEnglish) {
    insights.push({
      id: createId("analysis"),
      category: "usability",
      title: "Mixed-language labeling may confuse operators",
      summary: "The reachable UI mixes Spanish and English labels, increasing cognitive load during navigation and support workflows.",
      recommendation: "Standardize the locale strategy so headings, actions, and navigation labels remain consistent for a given user session.",
      confidence: 0.76,
      evidence: evidenceFrom(
        surfacedLabels[0] ? { type: "surface", label: surfacedLabels[0] } : null,
        surfacedLabels[1] ? { type: "surface", label: surfacedLabels[1] } : null,
        { type: "artifact", label: "Page Crawl" }
      )
    });
  }

  if ((crawlSnapshot.visitedViews ?? []).some((view) => view.headings.length === 0)) {
    insights.push({
      id: createId("analysis"),
      category: "information-architecture",
      title: "Some views lack clear heading-level orientation",
      summary: "Several discovered views expose navigation and controls but no visible heading, making it harder for users to confirm where they are.",
      recommendation: "Add stable page or section headings to each major workspace so users can orient themselves after navigation.",
      confidence: 0.74,
      evidence: evidenceFrom(
        ...visitedViews
          .filter((view) => view.headings.length === 0)
          .slice(0, 3)
          .map((view) => ({ type: "view" as const, label: view.label })),
        { type: "artifact", label: "Page Crawl" }
      )
    });
  }

  if (placeholderOnlyDefect) {
    insights.push({
      id: createId("analysis"),
      category: "accessibility",
      title: "Form controls need explicit accessible labels",
      summary: "At least one discovered input relies on placeholder text rather than a stable accessible label or input name.",
      recommendation: "Add visible labels or accessible name attributes so assistive technologies and automation can identify control purpose reliably.",
      confidence: 0.86,
      evidence: evidenceFrom(
        unlabeledInput ? { type: "input", label: unlabeledInput.placeholder || unlabeledInput.ariaLabel || unlabeledInput.type || unlabeledInput.tag } : null,
        { type: "defect", label: placeholderOnlyDefect.title },
        { type: "artifact", label: "Page Crawl" }
      )
    });
  }

  if (indistinctNavigationDefect) {
    insights.push({
      id: createId("analysis"),
      category: "qa-recommendation",
      title: "Some navigation targets may feel unresponsive to users",
      summary: "The discovery run found views whose visible surface was indistinguishable from landing, which can look like broken or ineffective navigation.",
      recommendation: "Add clearer view-specific content, empty states, or transition cues so users can tell the navigation action succeeded.",
      confidence: 0.72,
      evidence: evidenceFrom(
        { type: "defect", label: indistinctNavigationDefect.title },
        { type: "artifact", label: "Page Crawl" }
      )
    });
  }

  if (!insights.length) {
    insights.push({
      id: createId("analysis"),
      category: "qa-recommendation",
      title: `${plan.featureArea} produced no high-confidence UX recommendation`,
      summary: "The bounded QA analysis did not find a strong product recommendation from the current crawl alone.",
      recommendation: "Capture a deeper crawl or allow targeted interactive probes for the highest-risk user journeys.",
      confidence: 0.55,
      evidence: [{ type: "artifact", label: "Page Crawl" }]
    });
  }

  return insights;
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
    const discoverySurface = summarizeDiscovery(crawlSnapshot, deps);
    const scenarioSet = await generateScenarios(record.plan, { crawlContent });
    const discoveryDefects = buildDiscoveryDefects(crawlSnapshot, record.plan, deps);
    const analysisInsights = buildAnalysisInsights(crawlSnapshot, discoverySurface, discoveryDefects, record.plan);
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

    return {
      ...record,
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: "pass",
      currentPhase: "reporting",
      currentActivity: "Discovery reporting completed.",
      currentStepNumber: undefined,
      currentScenarioIndex: undefined,
      currentScenarioTitle: undefined,
      summary: "The exploratory discovery run crawled the reachable UI and proposed manual tests based on the observed surface.",
      generatedScenarios: scenarioSet.scenarios,
      riskSummary: scenarioSet.riskSummary,
      coverageGaps: scenarioSet.coverageGaps,
      stepResults,
      artifacts,
      defects: discoveryDefects,
      analysisInsights
    };
  } catch (error) {
    const isCancellation = error instanceof Error && error.name === "RunCancelledError";

    if (isCancellation) {
      return {
        ...record,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: "cancelled",
        currentPhase: "cancelled",
        currentActivity: "Run cancelled during exploratory discovery.",
        currentStepNumber: undefined,
        currentScenarioIndex: undefined,
        currentScenarioTitle: undefined,
        summary: "The exploratory discovery run was cancelled before completion.",
        stepResults,
        artifacts: screenshotArtifacts,
        defects: [],
        analysisInsights: []
      };
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

    return {
      ...record,
      updatedAt: new Date().toISOString(),
      status: "fail",
      currentPhase: "reporting",
      currentActivity: "Discovery reporting failed unexpectedly.",
      currentStepNumber: undefined,
      currentScenarioIndex: undefined,
      currentScenarioTitle: undefined,
      summary: "The exploratory discovery run failed before it could complete the crawl.",
      stepResults,
      artifacts,
      defects: [],
      analysisInsights: []
    };
  }
}