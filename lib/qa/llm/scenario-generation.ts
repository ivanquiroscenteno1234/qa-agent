import type { Scenario } from "@/lib/types";
import { getQaLlmConfig } from "@/lib/qa/llm/config";
import { getQaLlmClient } from "@/lib/qa/llm/provider";
import type { GenerateScenariosLlmInput } from "@/lib/qa/llm/types";
import { createId } from "@/lib/qa/utils";

/**
 * Optionally generates additional scenarios via Gemini when the
 * QA_LLM_SCENARIO_GENERATION feature flag is enabled.
 *
 * Returns an empty array when the provider is disabled, not configured,
 * or the call fails — so the deterministic generator always runs first
 * and its results are always preserved.
 *
 * Each returned scenario receives generationSource: "llm".
 */
export async function generateLlmScenarios(
  input: GenerateScenariosLlmInput
): Promise<Scenario[]> {
  const config = getQaLlmConfig();

  if (!config.features.scenarioGeneration || !config.configured) {
    return [];
  }

  const client = getQaLlmClient();
  const result = await client.generateScenarios(input);

  if (result.source !== "llm") {
    return [];
  }

  return result.data.scenarios.map((s) => ({
    id: createId("scenario"),
    title: s.title,
    priority: s.priority,
    type: s.type,
    prerequisites: ["Valid environment selected", "Required test data available"],
    steps: s.steps,
    expectedResult: s.expectedResult,
    riskRationale: s.riskRationale,
    approvedForAutomation: false,
    generationSource: "llm" as const
  }));
}
