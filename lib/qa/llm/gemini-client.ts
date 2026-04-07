import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  analyzeRunResponseSchema,
  generateScenariosResponseSchema,
  normalizeStepsResponseSchema
} from "@/lib/qa/llm/types";
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
import {
  buildReviewAnalysisPrompt,
  buildScenarioGenerationPrompt,
  buildStepNormalizationPrompt
} from "@/lib/qa/llm/prompts";

/**
 * Gemini SDK client implementing QaLlmClient.
 *
 * All SDK calls are wrapped in try/catch. On any error:
 * - A warning is printed to stderr (never stored in run records).
 * - The method returns source: "deterministic" with an empty/fallback result.
 *
 * Every model response is validated through Zod schemas before being returned
 * to callers. Invalid responses are treated the same as SDK errors.
 */
export class GeminiClient implements QaLlmClient {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;
  private readonly apiKey: string;

  constructor(apiKey: string, modelName: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  private async callModel(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  private sanitizeError(err: unknown): string {
    // Strip any API key substrings from logged error messages
    const raw = err instanceof Error ? err.message : String(err);
    const key = this.apiKey || (process.env.GEMINI_API_KEY ?? "");
    return key ? raw.replaceAll(key, "[REDACTED]") : raw;
  }

  async normalizeSteps(input: NormalizeStepsInput): Promise<LlmCapabilityResult<NormalizeStepsResponse>> {
    try {
      const prompt = buildStepNormalizationPrompt(input);
      const text = await this.callModel(prompt);
      const parsed = JSON.parse(text) as unknown;
      const validated = normalizeStepsResponseSchema.parse(parsed);
      return { source: "llm", confidence: 0.9, data: validated };
    } catch (err) {
      console.warn("[GeminiClient] normalizeSteps failed:", this.sanitizeError(err));
      return {
        source: "deterministic",
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
  }

  async generateScenarios(input: GenerateScenariosLlmInput): Promise<LlmCapabilityResult<GenerateScenariosLlmResponse>> {
    try {
      const prompt = buildScenarioGenerationPrompt(input);
      const text = await this.callModel(prompt);
      const parsed = JSON.parse(text) as unknown;
      const validated = generateScenariosResponseSchema.parse(parsed);
      return { source: "llm", confidence: 0.85, data: validated };
    } catch (err) {
      console.warn("[GeminiClient] generateScenarios failed:", this.sanitizeError(err));
      return { source: "deterministic", confidence: 1, data: { scenarios: [] } };
    }
  }

  async analyzeRun(input: AnalyzeRunInput): Promise<LlmCapabilityResult<AnalyzeRunResponse>> {
    try {
      const prompt = buildReviewAnalysisPrompt(input);
      const text = await this.callModel(prompt);
      const parsed = JSON.parse(text) as unknown;
      const validated = analyzeRunResponseSchema.parse(parsed);
      return { source: "llm", confidence: 0.85, data: validated };
    } catch (err) {
      console.warn("[GeminiClient] analyzeRun failed:", this.sanitizeError(err));
      return { source: "deterministic", confidence: 1, data: { insights: [] } };
    }
  }
}
