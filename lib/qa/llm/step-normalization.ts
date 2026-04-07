import type { ActionType, ParsedStep } from "@/lib/types";
import { getQaLlmConfig } from "@/lib/qa/llm/config";
import { getQaLlmClient } from "@/lib/qa/llm/provider";

/**
 * Optionally passes already-parsed steps through Gemini for structured
 * normalization (re-classifying actionType and targetDescription).
 *
 * Returns the original steps unchanged when:
 * - The QA_LLM_STEP_PARSING feature flag is false
 * - The LLM provider is disabled or not configured
 * - The LLM call fails or produces an invalid response
 *
 * Each returned step receives a `parsingSource` annotation indicating whether
 * LLM or heuristic logic produced the final classification.
 */
export async function normalizeParsedSteps(
  steps: ParsedStep[],
  context?: string
): Promise<ParsedStep[]> {
  const config = getQaLlmConfig();

  if (!config.features.stepParsing || !config.configured) {
    return steps.map((step) => ({ ...step, parsingSource: "heuristic" as const }));
  }

  const client = getQaLlmClient();
  const result = await client.normalizeSteps({
    rawSteps: steps.map((s) => s.rawText),
    context
  });

  if (result.source === "disabled" || result.source === "deterministic") {
    return steps.map((step) => ({ ...step, parsingSource: "heuristic" as const }));
  }

  // Merge LLM output back onto the original parsed steps.
  // We keep all original fields and only overwrite actionType + targetDescription
  // when the LLM returned a valid entry for that index position.
  const llmByIndex = new Map(result.data.steps.map((s) => [s.index, s]));

  return steps.map((step, idx) => {
    const llmStep = llmByIndex.get(idx);

    if (!llmStep) {
      return { ...step, parsingSource: "heuristic" as const };
    }

    return {
      ...step,
      actionType: llmStep.actionType as ActionType,
      targetDescription: llmStep.targetDescription,
      expectedResult: llmStep.expectedResult ?? step.expectedResult,
      parsingSource: "llm" as const
    };
  });
}
