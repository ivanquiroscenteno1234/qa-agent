import type { AnalysisInsight, DefectCandidate, ParsedStep, RunRecord, RunStatus, StepResult, StepStatus } from "@/lib/types";
import type { Scenario } from "@/lib/types";

import { createId } from "@/lib/qa/utils";
import {
  REVIEW_ANALYSIS_PROMPT_VERSION,
  SCENARIO_GENERATION_PROMPT_VERSION,
  STEP_NORMALIZATION_PROMPT_VERSION
} from "@/lib/qa/llm/prompts";

export function createSyntheticStepResult(
  stepNumber: number,
  userStepText: string,
  normalizedAction: ParsedStep["actionType"],
  observedTarget: string,
  actionResult: string,
  assertionResult: StepStatus,
  notes: string,
  screenshotLabel: string,
  screenshotArtifactId?: string,
  policyHandler?: string
): StepResult {
  return {
    stepId: createId("step"),
    stepNumber,
    userStepText,
    normalizedAction,
    observedTarget,
    actionResult,
    assertionResult,
    notes,
    screenshotLabel,
    screenshotArtifactId,
    policyHandler
  };
}

export function buildStepResult(
  step: ParsedStep,
  stepNumber: number,
  observedTarget: string,
  actionResult: string,
  assertionResult: StepStatus,
  notes: string,
  screenshotLabel: string,
  screenshotArtifactId?: string
): StepResult {
  return {
    stepId: step.id,
    stepNumber,
    userStepText: step.rawText,
    normalizedAction: step.actionType,
    observedTarget,
    actionResult,
    assertionResult,
    notes,
    screenshotLabel,
    screenshotArtifactId
  };
}

export function buildDefects(stepResults: StepResult[], featureArea: string): DefectCandidate[] {
  return stepResults
    .filter((result) => result.assertionResult !== "pass")
    .map((result) => ({
      id: createId("defect"),
      title: `${featureArea || "Feature"}: ${result.observedTarget} failed QA verification`,
      severity: result.assertionResult === "blocked" ? "medium" : "high",
      priority: result.assertionResult === "blocked" ? "P1" : "P0",
      expectedResult: result.userStepText,
      actualResult: result.actionResult,
      stepsToReproduce: [result.userStepText],
      confidence: result.assertionResult === "blocked" ? 0.68 : 0.91
    }));
}

export function computeInsightComparison(
  currentInsights: AnalysisInsight[],
  baselineInsights: AnalysisInsight[]
): { persisting: string[]; resolved: string[]; new: string[] } {
  const currentTitles = new Set(currentInsights.map((i) => i.title));
  const baselineTitles = new Set(baselineInsights.map((i) => i.title));

  const persisting = currentInsights.filter((i) => baselineTitles.has(i.title)).map((i) => i.title);
  const resolved = baselineInsights.filter((i) => !currentTitles.has(i.title)).map((i) => i.title);
  const newInsights = currentInsights.filter((i) => !baselineTitles.has(i.title)).map((i) => i.title);

  return { persisting, resolved, new: newInsights };
}

export function buildTerminalRunRecord(
  record: RunRecord,
  options: {
    status: RunStatus;
    currentPhase: RunRecord["currentPhase"];
    currentActivity: string;
    summary: string;
    stepResults: StepResult[];
    artifacts: RunRecord["artifacts"];
    defects: RunRecord["defects"];
    analysisInsights?: RunRecord["analysisInsights"];
    insightComparison?: RunRecord["insightComparison"];
  }
): RunRecord {
  const timestamp = new Date().toISOString();
  const insights = options.analysisInsights ?? [];
  const scenarios = record.generatedScenarios ?? [];
  const parsedSteps = record.parsedSteps ?? [];

  const llmMetadata: RunRecord["llmMetadata"] = {
    stepParsing: parsedSteps.some((step) => step.parsingSource === "llm")
      ? "llm"
      : "heuristic",
    scenarioGeneration: scenarios.some(
      (s: Scenario) => s.generationSource === "llm"
    )
      ? "llm"
      : "deterministic",
    reviewAnalysis: insights.some((i: AnalysisInsight) => i.analysisSource === "llm") ? "llm" : "heuristic",
    promptVersions: {
      stepNormalization: STEP_NORMALIZATION_PROMPT_VERSION,
      scenarioGeneration: SCENARIO_GENERATION_PROMPT_VERSION,
      reviewAnalysis: REVIEW_ANALYSIS_PROMPT_VERSION
    }
  };

  return {
    ...record,
    updatedAt: timestamp,
    completedAt: timestamp,
    status: options.status,
    currentPhase: options.currentPhase,
    currentActivity: options.currentActivity,
    currentStepNumber: undefined,
    currentScenarioIndex: undefined,
    currentScenarioTitle: undefined,
    summary: options.summary,
    stepResults: options.stepResults,
    artifacts: options.artifacts,
    defects: options.defects,
    analysisInsights: insights,
    llmMetadata,
    ...(options.insightComparison ? { insightComparison: options.insightComparison } : {})
  };
}