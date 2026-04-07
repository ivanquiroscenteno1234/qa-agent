import type { GenerateScenariosResponse, RunPlan, Scenario, ScenarioType } from "@/lib/types";
import { generateLlmScenarios } from "@/lib/qa/llm/scenario-generation";
import { parsePlainTextSteps } from "@/lib/qa/step-parser";
import { createId, titleCase } from "@/lib/qa/utils";

interface CrawlSnapshot {
  title?: string;
  url?: string;
  headings?: string[];
  buttons?: string[];
  links?: string[];
  navigationCandidates?: string[];
  visitedViews?: Array<{
    label?: string;
    url?: string;
    title?: string;
    headings?: string[];
    buttons?: string[];
    links?: string[];
    inputs?: Array<{
      tag?: string;
      name?: string;
      type?: string;
      placeholder?: string;
      ariaLabel?: string;
    }>;
  }>;
  inputs?: Array<{
    tag?: string;
    name?: string;
    type?: string;
    placeholder?: string;
    ariaLabel?: string;
  }>;
}

function buildScenario(
  type: ScenarioType,
  title: string,
  steps: string[],
  expectedResult: string,
  riskRationale: string,
  approvedForAutomation = true,
  priority: Scenario["priority"] = "P1"
): Scenario {
  return {
    id: createId("scenario"),
    title,
    priority,
    type,
    prerequisites: ["Valid environment selected", "Required test data available"],
    steps,
    expectedResult,
    riskRationale,
    approvedForAutomation
  };
}

function parseCrawlSnapshot(crawlContent?: string): CrawlSnapshot | null {
  if (!crawlContent) {
    return null;
  }

  try {
    return JSON.parse(crawlContent) as CrawlSnapshot;
  } catch {
    return null;
  }
}

function uniqueNonEmpty(values: Array<string | undefined>, limit: number): string[] {
  const items = new Set<string>();

  for (const value of values) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }

    items.add(normalized);
    if (items.size >= limit) {
      break;
    }
  }

  return Array.from(items);
}

function isLowSignalLabel(value: string): boolean {
  const normalized = value.toLowerCase();
  return !normalized || /^\d+$/.test(normalized) || /^(aceptar|accept|cancelar|cancel|cerrar|close|ok|si|no)$/.test(normalized);
}

function selectTopDiscoveryLabels(values: Array<string | undefined>, limit: number): string[] {
  return uniqueNonEmpty(values, 50)
    .filter((value) => !isLowSignalLabel(value))
    .sort((left, right) => {
      const leftScore = /menu|inventario|config|pedido|combo|promo|chat|panel|perfil/i.test(left) ? 1 : 0;
      const rightScore = /menu|inventario|config|pedido|combo|promo|chat|panel|perfil/i.test(right) ? 1 : 0;
      return rightScore - leftScore;
    })
    .slice(0, limit);
}

function getDiscoverySurface(snapshot: CrawlSnapshot | null): string[] {
  if (!snapshot) {
    return [];
  }

  return selectTopDiscoveryLabels(
    [
      ...(snapshot.navigationCandidates ?? []),
      ...((snapshot.visitedViews ?? []).map((view) => view.label)),
      ...(snapshot.headings ?? []),
      ...(snapshot.buttons ?? []),
      ...(snapshot.links ?? []),
      ...(snapshot.inputs ?? []).map((input) => input.ariaLabel || input.placeholder || input.name || input.type || input.tag)
    ],
    8
  );
}

export function generateScenarios(plan: RunPlan, options?: { crawlContent?: string }): GenerateScenariosResponse {
  const parsed = parsePlainTextSteps(plan.stepsText);
  const crawlSnapshot = parseCrawlSnapshot(options?.crawlContent);
  const feature = plan.featureArea.trim() || "Feature under test";
  const role = plan.role.trim() || "configured role";
  const objective = plan.objective.trim() || `Validate ${feature}`;
  const discoverySurface = getDiscoverySurface(crawlSnapshot);
  const targetSection =
    parsed.parsedSteps.find((step) => step.actionType === "open-section")?.targetDescription ?? discoverySurface[0] ?? feature;
  const navigationTargets = discoverySurface.slice(0, 3);
  const allInputs = [
    ...(crawlSnapshot?.inputs ?? []),
    ...((crawlSnapshot?.visitedViews ?? []).flatMap((view) => view.inputs ?? []))
  ];
  const formTargets = selectTopDiscoveryLabels(
    allInputs.map((input) => input.ariaLabel || input.placeholder || input.name || input.type || input.tag),
    3
  );

  if (!parsed.parsedSteps.length && plan.mode === "exploratory-session") {
    const discoveredArea = navigationTargets.join(", ") || "the visible application surface";
    const formArea = formTargets.join(", ") || "any visible form controls";

    return {
      scenarios: [
        buildScenario(
          "exploratory",
          `${titleCase(feature)} discovery sweep`,
          [
            `Open ${plan.targetUrl}.`,
            `Map the first-level navigation and visible modules: ${discoveredArea}.`,
            "Capture any confusing labels, dead ends, or missing affordances.",
            "Turn notable observations into reusable manual regression checks."
          ],
          "The session identifies the reachable product surface and produces concrete manual test ideas.",
          "Discovery-first sessions are useful when the exact workflow is unknown or still changing.",
          false,
          "P0"
        ),
        buildScenario(
          "happy-path",
          `${titleCase(feature)} primary navigation remains reachable`,
          [
            `Open ${plan.targetUrl}.`,
            `Traverse the highest-signal areas discovered on the page: ${discoveredArea}.`,
            "Verify each route loads usable content without blank or broken states."
          ],
          "Primary navigation options remain reachable and render stable content.",
          "Navigation regressions are usually the first breakage surfaced during exploratory crawling.",
          false,
          "P0"
        ),
        buildScenario(
          "permissions",
          `${titleCase(role)} permissions align with discovered actions`,
          [
            `Inspect the visible actions in ${discoveredArea}.`,
            "Identify create, edit, delete, publish, or configuration controls.",
            "Verify the current role sees only the actions it should be allowed to perform."
          ],
          "Sensitive actions align with the authenticated role and are not leaked unexpectedly.",
          "Discovery often reveals privileged controls that were not called out in scripted test cases.",
          false,
          "P0"
        ),
        buildScenario(
          "negative",
          `Authentication and session boundaries stay controlled around ${titleCase(feature)}`,
          [
            "Open a protected route directly in a fresh session.",
            "Verify the product redirects, blocks access, or prompts for authentication intentionally.",
            "Repeat after logout or session expiry if available."
          ],
          "Protected areas stay protected, and session loss does not leave partial access behind.",
          "Even discovery runs should suggest manual checks for the most likely auth regressions.",
          false,
          "P1"
        ),
        buildScenario(
          formTargets.length ? "state-transition" : "boundary",
          formTargets.length
            ? `${titleCase(feature)} form behavior is intentional`
            : `${titleCase(feature)} empty and edge states are intentional`,
          formTargets.length
            ? [
                `Inspect discovered form controls: ${formArea}.`,
                "Try missing, malformed, and unusually long values where safe.",
                "Verify validation, persistence, and recovery messaging are explicit."
              ]
            : [
                `Inspect ${discoveredArea} for empty lists, first-run states, or missing data handling.`,
                "Verify the UI communicates clearly when there is nothing to show or configure.",
                "Capture any layout collapse, placeholder leaks, or ambiguous copy."
              ],
          formTargets.length
            ? "Inputs validate safely and communicate state changes clearly."
            : "Non-happy-path states are understandable and recoverable.",
          formTargets.length
            ? "Discovered forms are a common source of silent validation and state bugs."
            : "Discovery should still cover empty and edge conditions when no forms are exposed.",
          false,
          "P1"
        )
      ],
      riskSummary: [
        `Primary objective: ${objective}`,
        `Discovery surface sampled: ${discoveredArea}`,
        `Visible inputs discovered: ${formTargets.length ? formArea : "No obvious form controls on the crawled page."}`,
        plan.safeMode
          ? "Run is configured for observe-only execution, so the suggestions favor navigation, permissions, and validation checks over writes."
          : "Interactive execution is enabled, so discovered flows may include write actions if the operator approves them."
      ],
      coverageGaps: [
        "The discovery snapshot reflects the currently reachable UI, not the full application graph.",
        "Cross-browser execution is not yet validated by the MVP runtime.",
        "Network failure injection and accessibility-specific checks are not automated yet."
      ]
    };
  }

  const scenarios: Scenario[] = [
    buildScenario(
      "happy-path",
      `${titleCase(feature)} core execution for ${role}`,
      parsed.parsedSteps.map((step) => step.rawText),
      plan.expectedOutcomes || objective,
      "This is the primary business-critical path and should remain stable across releases.",
      true,
      "P0"
    ),
    buildScenario(
      "permissions",
      `${titleCase(targetSection)} is editable only for authorized roles`,
      [
        `Open ${targetSection}.`,
        "Authenticate with an editor-capable account.",
        "Verify edit controls are visible and enabled.",
        "Repeat with a viewer-only account.",
        "Verify edit controls are hidden or disabled for the viewer."
      ],
      "Authorized users can edit, while unauthorized users are prevented from modifying content.",
      "Permission leakage is a high-value QA finding because it directly affects access control.",
      true,
      "P0"
    ),
    buildScenario(
      "negative",
      `Invalid login is rejected before reaching ${titleCase(targetSection)}`,
      [
        `Navigate to ${plan.targetUrl}.`,
        "Attempt login with invalid credentials.",
        `Try to reach ${targetSection} from the protected area.`
      ],
      "The application blocks access and shows a clear authentication error.",
      "Authentication failures should never produce a false pass or partial access.",
      true,
      "P1"
    ),
    buildScenario(
      "state-transition",
      `${titleCase(targetSection)} preserves editing state correctly`,
      [
        `Open ${targetSection}.`,
        "Enter edit mode.",
        "Modify a value without saving.",
        "Refresh or navigate away and come back.",
        "Verify the application handles unsaved changes intentionally."
      ],
      "The application either warns about unsaved changes or preserves draft state consistently.",
      "State loss and silent save failures are common regressions in content-management flows.",
      true,
      "P1"
    ),
    buildScenario(
      "exploratory",
      `${titleCase(feature)} exploratory charter`,
      [
        `Explore ${targetSection} for 20 minutes with focus on navigation, editability, error handling, and role boundaries.`,
        "Capture any inconsistent states, confusing labels, or save failures.",
        "Convert interesting findings into reusable regression scenarios."
      ],
      "The session should produce either confidence in the flow or concrete defect candidates with evidence.",
      "Exploratory testing finds issues not captured by scripted steps, especially around edge cases and usability.",
      false,
      "P2"
    )
  ];

  const riskSummary = [
    `Primary objective: ${objective}`,
    `Most sensitive area: ${targetSection}`,
    plan.safeMode
      ? "Run is configured for observe-only execution, which reduces blast radius but limits save-flow validation."
      : "Interactive execution is enabled, so approval gates should remain active for destructive actions."
  ];

  const coverageGaps = [
    "Cross-browser execution is not yet validated by the MVP runtime.",
    "No credential vault backend is configured in this local runtime.",
    "Network failure injection and accessibility-specific checks are not automated yet."
  ];

  return {
    scenarios,
    coverageGaps,
    riskSummary
  };
}

/**
 * Async variant: runs the deterministic generator first, then merges in
 * Gemini-generated scenarios when QA_LLM_SCENARIO_GENERATION is enabled.
 * Deterministic scenarios are annotated generationSource: "deterministic".
 */
export async function generateScenariosWithLlm(
  plan: RunPlan,
  options?: { crawlContent?: string }
): Promise<GenerateScenariosResponse> {
  const base = generateScenarios(plan, options);
  const deterministicScenarios: Scenario[] = base.scenarios.map((s) => ({
    ...s,
    generationSource: "deterministic" as const
  }));

  const crawlSnapshot = parseCrawlSnapshot(options?.crawlContent);
  const discoverySurface = getDiscoverySurface(crawlSnapshot);
  const parsed = parsePlainTextSteps(plan.stepsText);
  const parsedStepSummary = parsed.parsedSteps
    .slice(0, 6)
    .map((s, i) => `${i + 1}. [${s.actionType}] ${s.targetDescription}`)
    .join("; ");

  const llmScenarios = await generateLlmScenarios({
    featureArea: plan.featureArea || "Feature under test",
    role: plan.role || "operator",
    objective: plan.objective || `Validate ${plan.featureArea}`,
    targetUrl: plan.targetUrl,
    parsedStepSummary,
    discoverySurface,
    riskLevel: plan.riskLevel
  });

  return {
    ...base,
    scenarios: [...deterministicScenarios, ...llmScenarios]
  };
}