import type { PageSurface } from "@/lib/qa/crawl-model";
import type { CrawlSnapshot } from "@/lib/qa/crawl-model";
import { createId } from "@/lib/qa/utils";
import type {
  AnalysisEvidenceReference,
  AnalysisInsight,
  Artifact,
  DefectCandidate,
  ExecutionWarning,
  RunPlan,
  StepResult
} from "@/lib/types";

export interface AnalysisInput {
  stepResults: StepResult[];
  artifacts: Artifact[];
  warnings: ExecutionWarning[];
  crawlSurface?: PageSurface;
  /** Raw crawl snapshot used for deeper structural analysis */
  crawlSnapshot?: CrawlSnapshot;
  defects?: DefectCandidate[];
  discoverySurface?: string[];
  plan?: RunPlan;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function evidenceFrom(
  ...items: Array<AnalysisEvidenceReference | null | undefined>
): AnalysisEvidenceReference[] {
  return items.filter((item): item is AnalysisEvidenceReference => Boolean(item));
}

// ---------------------------------------------------------------------------
// Individual heuristic rules
// ---------------------------------------------------------------------------

function analyzeMenuManagement(
  discoverySurface: string[],
  crawlSnapshot: CrawlSnapshot,
  surfacedLabels: string[]
): AnalysisInsight | null {
  if (!discoverySurface.some((item) => /men[uú]|gesti[oó]n de men[uú]|art[ií]culos del men[uú]/i.test(item))) {
    return null;
  }
  const visitedViews = crawlSnapshot.visitedViews ?? [];
  return {
    id: createId("analysis"),
    category: "intended-flow",
    evidenceKind: "interpreted",
    title: "Likely intended pass flow: menu management",
    summary:
      "The discovered navigation suggests restaurant partners are expected to reach menu management, review categories, and manage menu items successfully.",
    recommendation:
      "Ensure menu views, category editing, item creation, and save feedback remain visible and distinct for operators.",
    confidence: 0.83,
    evidence: evidenceFrom(
      {
        type: "surface",
        label:
          surfacedLabels.find((item) => /men[uú]|gesti[oó]n de men[uú]|art[ií]culos del men[uú]/i.test(item)) ??
          "Menu-related surface discovered"
      },
      visitedViews.find((view) => /men[uú]/i.test(view.label))
        ? {
            type: "view",
            label:
              visitedViews.find((view) => /men[uú]/i.test(view.label))?.label ?? "Menú"
          }
        : null,
      { type: "artifact", label: "Page Crawl" }
    )
  };
}

function analyzeCombosAndPromos(
  discoverySurface: string[],
  crawlSnapshot: CrawlSnapshot,
  surfacedLabels: string[]
): AnalysisInsight | null {
  if (!discoverySurface.some((item) => /combos|promos|bundle/i.test(item))) {
    return null;
  }
  const visitedViews = crawlSnapshot.visitedViews ?? [];
  return {
    id: createId("analysis"),
    category: "intended-flow",
    evidenceKind: "interpreted",
    title: "Likely intended pass flow: combos and promotions",
    summary:
      "The product appears to support combo and promotion management as a first-class restaurant workflow.",
    recommendation:
      "The dev team should verify that list, create, edit, pause, and resume states for combos all produce clear, distinct UI transitions.",
    confidence: 0.79,
    evidence: evidenceFrom(
      {
        type: "surface",
        label:
          surfacedLabels.find((item) => /combos|promos|bundle/i.test(item)) ??
          "Combos or promos surface discovered"
      },
      visitedViews.find((view) => /combos|promos|bundle/i.test(view.label))
        ? {
            type: "view",
            label:
              visitedViews.find((view) => /combos|promos|bundle/i.test(view.label))?.label ??
              "Combos & promos"
          }
        : null,
      { type: "artifact", label: "Page Crawl" }
    )
  };
}

function analyzeMixedLanguage(
  combinedText: string,
  surfacedLabels: string[]
): AnalysisInsight | null {
  const hasSpanish = /men[uú]|configuraci[oó]n|art[ií]culos|gesti[oó]n|anal[ií]tica/i.test(combinedText);
  const hasEnglish = /bundle|combo|menu|edit|pause|settings|panel/i.test(combinedText);
  if (!hasSpanish || !hasEnglish) {
    return null;
  }
  return {
    id: createId("analysis"),
    category: "inconsistent-language",
    evidenceKind: "interpreted",
    title: "Mixed-language labeling may confuse operators",
    summary:
      "The reachable UI mixes Spanish and English labels, increasing cognitive load during navigation and support workflows.",
    recommendation:
      "Standardize the locale strategy so headings, actions, and navigation labels remain consistent for a given user session.",
    confidence: 0.76,
    evidence: evidenceFrom(
      surfacedLabels[0] ? { type: "surface", label: surfacedLabels[0] } : null,
      surfacedLabels[1] ? { type: "surface", label: surfacedLabels[1] } : null,
      { type: "artifact", label: "Page Crawl" }
    )
  };
}

function analyzeHeadinglessViews(crawlSnapshot: CrawlSnapshot): AnalysisInsight | null {
  const visitedViews = crawlSnapshot.visitedViews ?? [];
  if (!visitedViews.some((view) => view.headings.length === 0)) {
    return null;
  }
  return {
    id: createId("analysis"),
    category: "missing-label",
    evidenceKind: "observed",
    title: "Some views lack clear heading-level orientation",
    summary:
      "Several discovered views expose navigation and controls but no visible heading, making it harder for users to confirm where they are.",
    recommendation:
      "Add stable page or section headings to each major workspace so users can orient themselves after navigation.",
    confidence: 0.74,
    evidence: evidenceFrom(
      ...visitedViews
        .filter((view) => view.headings.length === 0)
        .slice(0, 3)
        .map((view) => ({ type: "view" as const, label: view.label })),
      { type: "artifact", label: "Page Crawl" }
    )
  };
}

function analyzeUnlabeledInputs(
  defects: DefectCandidate[],
  crawlSnapshot: CrawlSnapshot
): AnalysisInsight | null {
  const placeholderOnlyDefect = defects.find((defect) =>
    /placeholder text only/i.test(defect.title)
  );
  if (!placeholderOnlyDefect) {
    return null;
  }
  const visitedViews = crawlSnapshot.visitedViews ?? [];
  const unlabeledInput = visitedViews
    .flatMap((view) => view.inputs ?? [])
    .find((input) => input.placeholder || input.ariaLabel || input.type || input.tag);

  return {
    id: createId("analysis"),
    category: "missing-label",
    evidenceKind: "observed",
    title: "Form controls need explicit accessible labels",
    summary:
      "At least one discovered input relies on placeholder text rather than a stable accessible label or input name.",
    recommendation:
      "Add visible labels or accessible name attributes so assistive technologies and automation can identify control purpose reliably.",
    confidence: 0.86,
    evidence: evidenceFrom(
      unlabeledInput
        ? {
            type: "input",
            label:
              unlabeledInput.placeholder ||
              unlabeledInput.ariaLabel ||
              unlabeledInput.type ||
              unlabeledInput.tag ||
              "unknown"
          }
        : null,
      { type: "defect", label: placeholderOnlyDefect.title },
      { type: "artifact", label: "Page Crawl" }
    )
  };
}

function analyzeIndistinctNavigation(defects: DefectCandidate[]): AnalysisInsight | null {
  const indistinctNavigationDefect = defects.find((defect) =>
    /may not expose distinct content/i.test(defect.title)
  );
  if (!indistinctNavigationDefect) {
    return null;
  }
  return {
    id: createId("analysis"),
    category: "defect-candidate",
    evidenceKind: "observed",
    title: "Some navigation targets may feel unresponsive to users",
    summary:
      "The discovery run found views whose visible surface was indistinguishable from landing, which can look like broken or ineffective navigation.",
    recommendation:
      "Add clearer view-specific content, empty states, or transition cues so users can tell the navigation action succeeded.",
    confidence: 0.72,
    evidence: evidenceFrom(
      { type: "defect", label: indistinctNavigationDefect.title },
      { type: "artifact", label: "Page Crawl" }
    )
  };
}

function buildFallbackInsight(plan: RunPlan): AnalysisInsight {
  return {
    id: createId("analysis"),
    category: "manual-follow-up",
    evidenceKind: "interpreted",
    title: `${plan.featureArea} produced no high-confidence UX recommendation`,
    summary:
      "The bounded QA analysis did not find a strong product recommendation from the current crawl alone.",
    recommendation:
      "Capture a deeper crawl or allow targeted interactive probes for the highest-risk user journeys.",
    confidence: 0.55,
    evidence: [{ type: "artifact", label: "Page Crawl" }]
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive a list of QA insights from a completed run's evidence.
 *
 * When `crawlSnapshot` and `discoverySurface` are provided the full set of
 * heuristic rules is applied. Without them only step-result–based rules run.
 */
export function buildQaInsights(evidence: AnalysisInput): AnalysisInsight[] {
  const { crawlSnapshot, discoverySurface = [], defects = [], plan } = evidence;

  if (!crawlSnapshot) {
    return [];
  }

  const insights: AnalysisInsight[] = [];
  const combinedText = `${discoverySurface.join(" ")} ${(crawlSnapshot.buttons ?? []).join(" ")}`;
  const surfacedLabels = discoverySurface.slice(0, 4);

  const menuInsight = analyzeMenuManagement(discoverySurface, crawlSnapshot, surfacedLabels);
  if (menuInsight) insights.push(menuInsight);

  const combosInsight = analyzeCombosAndPromos(discoverySurface, crawlSnapshot, surfacedLabels);
  if (combosInsight) insights.push(combosInsight);

  const languageInsight = analyzeMixedLanguage(combinedText, surfacedLabels);
  if (languageInsight) insights.push(languageInsight);

  const headingInsight = analyzeHeadinglessViews(crawlSnapshot);
  if (headingInsight) insights.push(headingInsight);

  const inputInsight = analyzeUnlabeledInputs(defects, crawlSnapshot);
  if (inputInsight) insights.push(inputInsight);

  const navInsight = analyzeIndistinctNavigation(defects);
  if (navInsight) insights.push(navInsight);

  if (!insights.length && plan) {
    insights.push(buildFallbackInsight(plan));
  }

  return insights;
}
