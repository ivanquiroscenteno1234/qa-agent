import type { RunRecord, RunStatus, RunSummary } from "@/lib/types";

export interface RunProvenanceSummary {
  stepParsing: "llm" | "heuristic" | "unknown";
  scenarioGeneration: "llm" | "deterministic" | "unknown";
  reviewAnalysis: "llm" | "heuristic" | "unknown";
  hasLlmAssistance: boolean;
}

export interface MonitorSummaryViewModel {
  activeRuns: number;
  queuedRuns: number;
  draftRuns: number;
  completedRuns: number;
}

export interface RunListItemViewModel {
  id: string;
  featureArea: string;
  subtitle: string;
  status: RunStatus;
  progress: number | null;
  role: string;
  createdAtLabel: string;
}

export interface ReviewComparisonViewModel {
  previousComparableRun: RunSummary | null;
  comparisonDelta: {
    scenarioDelta: number;
    defectDelta: number;
    artifactDelta: number;
    stepDelta: number;
  } | null;
  scenarioValue: string;
  scenarioDetail: string;
  defectValue: string;
  defectDetail: string;
  artifactValue: string;
  artifactDetail: string;
  timelineValue: string;
  timelineDetail: string;
}

export function isRunActive(status: RunStatus): boolean {
  return ["queued", "running", "cancelling"].includes(status);
}

export function buildMonitorSummary(runs: RunSummary[]): MonitorSummaryViewModel {
  return {
    activeRuns: runs.filter((run) => isRunActive(run.status)).length,
    queuedRuns: runs.filter((run) => run.status === "queued").length,
    draftRuns: runs.filter((run) => run.status === "draft").length,
    completedRuns: runs.filter((run) => !isRunActive(run.status) && run.status !== "draft").length
  };
}

function deriveProgress(run: RunSummary): number | null {
  if (run.status === "draft") {
    return null;
  }

  if (!isRunActive(run.status)) {
    return 100;
  }

  const completedSteps = run.counts.stepResults;
  const parsedSteps = run.counts.parsedSteps;
  const scenarioSteps = run.counts.generatedScenarios;
  const baseline = Math.max(parsedSteps, scenarioSteps, 1);
  return Math.min(95, Math.max(8, Math.round((completedSteps / baseline) * 100)));
}

export function buildRunListItems(runs: RunSummary[]): RunListItemViewModel[] {
  return runs.map((run) => ({
    id: run.id,
    featureArea: run.plan.featureArea,
    subtitle: `${run.plan.mode} / ${run.plan.environment}`,
    status: run.status,
    progress: deriveProgress(run),
    role: run.plan.role,
    createdAtLabel: new Date(run.createdAt).toLocaleTimeString()
  }));
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export function buildReviewComparison(selectedRun: RunRecord | null, runs: RunSummary[]): ReviewComparisonViewModel {
  const previousComparableRun = selectedRun
    ? runs.find(
        (run) =>
          run.id !== selectedRun.id &&
          run.status !== "draft" &&
          run.plan.featureArea === selectedRun.plan.featureArea &&
          run.plan.mode === selectedRun.plan.mode &&
          run.plan.environment === selectedRun.plan.environment &&
          run.createdAt < selectedRun.createdAt
      ) ?? null
    : null;

  const comparisonDelta = selectedRun && previousComparableRun
    ? {
        scenarioDelta: selectedRun.generatedScenarios.length - previousComparableRun.counts.generatedScenarios,
        defectDelta: selectedRun.defects.length - previousComparableRun.counts.defects,
        artifactDelta: selectedRun.artifacts.length - previousComparableRun.counts.artifacts,
        stepDelta: selectedRun.stepResults.length - previousComparableRun.counts.stepResults
      }
    : null;

  return {
    previousComparableRun,
    comparisonDelta,
    scenarioValue: selectedRun ? `${selectedRun.generatedScenarios.length}` : "0",
    scenarioDetail:
      selectedRun && previousComparableRun && comparisonDelta
        ? `${formatDelta(comparisonDelta.scenarioDelta)} vs baseline ${previousComparableRun.counts.generatedScenarios}`
        : "No earlier comparable baseline",
    defectValue: selectedRun ? `${selectedRun.defects.length}` : "0",
    defectDetail:
      selectedRun && previousComparableRun && comparisonDelta
        ? `${formatDelta(comparisonDelta.defectDelta)} vs baseline ${previousComparableRun.counts.defects}`
        : "Current defect candidate count",
    artifactValue: selectedRun ? `${selectedRun.artifacts.length}` : "0",
    artifactDetail:
      selectedRun && previousComparableRun && comparisonDelta
        ? `${formatDelta(comparisonDelta.artifactDelta)} vs baseline ${previousComparableRun.counts.artifacts}`
        : "Current evidence package size",
    timelineValue: selectedRun ? `${selectedRun.stepResults.length || selectedRun.parsedSteps.length}` : "0",
    timelineDetail:
      selectedRun && previousComparableRun && comparisonDelta
        ? `${formatDelta(comparisonDelta.stepDelta)} vs baseline ${previousComparableRun.counts.stepResults}`
        : "Recorded review timeline entries"
  };
}

export function buildRunProvenanceSummary(run: RunRecord): RunProvenanceSummary {
  const meta = run.llmMetadata;

  if (!meta) {
    return { stepParsing: "unknown", scenarioGeneration: "unknown", reviewAnalysis: "unknown", hasLlmAssistance: false };
  }

  const hasLlmAssistance =
    meta.stepParsing === "llm" || meta.scenarioGeneration === "llm" || meta.reviewAnalysis === "llm";

  return { ...meta, hasLlmAssistance };
}