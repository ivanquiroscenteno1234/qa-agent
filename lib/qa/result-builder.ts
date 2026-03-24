import type { DefectCandidate, ParsedStep, RunRecord, RunStatus, StepResult, StepStatus } from "@/lib/types";

import { createId } from "@/lib/qa/utils";

export function createSyntheticStepResult(
  stepNumber: number,
  userStepText: string,
  normalizedAction: ParsedStep["actionType"],
  observedTarget: string,
  actionResult: string,
  assertionResult: StepStatus,
  notes: string,
  screenshotLabel: string,
  screenshotArtifactId?: string
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
    screenshotArtifactId
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
  }
): RunRecord {
  const timestamp = new Date().toISOString();

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
    analysisInsights: options.analysisInsights ?? []
  };
}