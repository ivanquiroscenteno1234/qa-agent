import type { AnalysisInsight, Artifact, ExecutionWarning, StepResult } from "@/lib/types";
import { getQaLlmConfig } from "@/lib/qa/llm/config";
import { getQaLlmClient } from "@/lib/qa/llm/provider";
import { createId } from "@/lib/qa/utils";

/**
 * Optionally invokes a Gemini analysis pass after evidence capture.
 *
 * Returns an empty array when the provider is disabled, not configured,
 * or the call fails — so the heuristic analysis from analysis-engine.ts
 * always runs first and its results are always preserved.
 *
 * Gemini must never overwrite artifacts, stepResults, or trace evidence.
 * Each returned insight receives analysisSource: "llm".
 */
export async function runLlmReviewAnalysis(input: {
  featureArea: string;
  mode: string;
  stepResults: StepResult[];
  warnings: ExecutionWarning[];
  artifacts: Artifact[];
  discoverySurface?: string[];
}): Promise<AnalysisInsight[]> {
  const config = getQaLlmConfig();

  if (!config.features.reviewAnalysis || !config.configured) {
    return [];
  }

  const client = getQaLlmClient();
  const result = await client.analyzeRun({
    featureArea: input.featureArea,
    mode: input.mode,
    stepResults: input.stepResults.map((s) => ({
      stepNumber: s.stepNumber,
      userStepText: s.userStepText,
      assertionResult: s.assertionResult,
      actionResult: s.actionResult,
      notes: s.notes
    })),
    warnings: input.warnings.map((w) => ({ message: w.message, category: w.category })),
    discoverySurface: input.discoverySurface ?? []
  });

  if (result.source !== "llm") {
    return [];
  }

  return result.data.insights.map((insight) => ({
    id: createId("analysis"),
    category: insight.category,
    evidenceKind: insight.evidenceKind,
    title: insight.title,
    summary: insight.summary,
    recommendation: insight.recommendation,
    confidence: insight.confidence,
    evidence: [],
    analysisSource: "llm" as const
  }));
}
