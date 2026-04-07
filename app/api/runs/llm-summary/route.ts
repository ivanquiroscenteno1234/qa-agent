import { NextResponse } from "next/server";

import { listRuns } from "@/lib/qa/store";

export interface LlmUsageSummary {
  totalCompleted: number;
  geminiStepParsing: number;
  geminiScenarioGeneration: number;
  geminiReviewAnalysis: number;
}

export async function GET(): Promise<NextResponse> {
  const runs = await listRuns();
  const completed = runs.filter((r) => r.status === "pass" || r.status === "fail" || r.status === "blocked" || r.status === "inconclusive" || r.status === "cancelled");

  const summary: LlmUsageSummary = {
    totalCompleted: completed.length,
    geminiStepParsing: completed.filter((r) => r.llmMetadata?.stepParsing === "llm").length,
    geminiScenarioGeneration: completed.filter((r) => r.llmMetadata?.scenarioGeneration === "llm").length,
    geminiReviewAnalysis: completed.filter((r) => r.llmMetadata?.reviewAnalysis === "llm").length
  };

  return NextResponse.json(summary);
}
