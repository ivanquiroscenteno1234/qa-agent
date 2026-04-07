import type {
  AnalyzeRunInput,
  AnalyzeRunResponse,
  GenerateScenariosLlmInput,
  GenerateScenariosLlmResponse,
  LlmCapabilityResult,
  NormalizeStepsInput,
  NormalizeStepsResponse,
  QaLlmClient
} from "@/lib/qa/llm/types";

/**
 * No-op LLM client. Returned when the LLM provider is disabled or not configured.
 * Never throws. Always returns a usable deterministic fallback result.
 */
export class NoopLlmClient implements QaLlmClient {
  async normalizeSteps(input: NormalizeStepsInput): Promise<LlmCapabilityResult<NormalizeStepsResponse>> {
    return {
      source: "disabled",
      confidence: 1,
      data: {
        steps: input.rawSteps.map((rawText, index) => ({
          index,
          rawText,
          normalizedText: rawText,
          actionType: "observe" as const,
          targetDescription: rawText
        }))
      }
    };
  }

  async generateScenarios(_input: GenerateScenariosLlmInput): Promise<LlmCapabilityResult<GenerateScenariosLlmResponse>> {
    return {
      source: "disabled",
      confidence: 1,
      data: { scenarios: [] }
    };
  }

  async analyzeRun(_input: AnalyzeRunInput): Promise<LlmCapabilityResult<AnalyzeRunResponse>> {
    return {
      source: "disabled",
      confidence: 1,
      data: { insights: [] }
    };
  }
}
