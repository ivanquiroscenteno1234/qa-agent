import { z } from "zod";
import type { AnalysisInsight, ParsedStep, Scenario } from "@/lib/types";

// ---------------------------------------------------------------------------
// LLM capability result wrapper
// ---------------------------------------------------------------------------

export interface LlmCapabilityResult<T> {
  /** Whether the result came from the live LLM, a deterministic fallback, or a disabled provider */
  source: "llm" | "deterministic" | "disabled";
  /** Confidence score in [0, 1] range. 1.0 for deterministic/disabled fallbacks. */
  confidence: number;
  data: T;
}

// ---------------------------------------------------------------------------
// normalizeSteps
// ---------------------------------------------------------------------------

export interface NormalizeStepsInput {
  rawSteps: string[];
  context?: string;
}

export const supportedNormalizedStepActionTypes = [
  "navigate",
  "login",
  "open-navigation",
  "open-section",
  "assert-editable",
  "assert-visible",
  "observe"
] as const;

export interface NormalizedStepOutput {
  index: number;
  rawText: string;
  normalizedText: string;
  actionType: ParsedStep["actionType"];
  targetDescription: string;
  expectedResult?: string;
}

export const normalizedStepSchema = z.object({
  index: z.number().int().nonnegative(),
  rawText: z.string(),
  normalizedText: z.string(),
  actionType: z.enum(supportedNormalizedStepActionTypes),
  targetDescription: z.string(),
  expectedResult: z.string().optional()
});

export const normalizeStepsResponseSchema = z.object({
  steps: z.array(normalizedStepSchema)
});

export type NormalizeStepsResponse = z.infer<typeof normalizeStepsResponseSchema>;

// ---------------------------------------------------------------------------
// generateScenarios
// ---------------------------------------------------------------------------

export interface GenerateScenariosLlmInput {
  featureArea: string;
  role: string;
  objective: string;
  targetUrl: string;
  parsedStepSummary: string;
  discoverySurface: string[];
  riskLevel: string;
}

export interface GeneratedScenarioOutput {
  title: string;
  type: Scenario["type"];
  priority: Scenario["priority"];
  steps: string[];
  expectedResult: string;
  riskRationale: string;
}

export const generatedScenarioSchema = z.object({
  title: z.string(),
  type: z.enum([
    "happy-path",
    "negative",
    "boundary",
    "permissions",
    "state-transition",
    "regression",
    "exploratory"
  ]),
  priority: z.enum(["P0", "P1", "P2"]),
  steps: z.array(z.string()).min(1),
  expectedResult: z.string(),
  riskRationale: z.string()
});

export const generateScenariosResponseSchema = z.object({
  scenarios: z.array(generatedScenarioSchema).min(1)
});

export type GenerateScenariosLlmResponse = z.infer<typeof generateScenariosResponseSchema>;

// ---------------------------------------------------------------------------
// analyzeRun
// ---------------------------------------------------------------------------

export interface AnalyzeRunInput {
  featureArea: string;
  mode: string;
  stepResults: Array<{
    stepNumber: number;
    userStepText: string;
    assertionResult: string;
    actionResult: string;
    notes: string;
  }>;
  warnings: Array<{ message: string; category?: string }>;
  discoverySurface: string[];
}

export interface AnalyzedInsightOutput {
  category: AnalysisInsight["category"];
  evidenceKind: "observed" | "interpreted";
  title: string;
  summary: string;
  recommendation: string;
  confidence: number;
}

export const analyzedInsightSchema = z.object({
  category: z.enum([
    "intended-flow",
    "usability-risk",
    "missing-label",
    "inconsistent-language",
    "defect-candidate",
    "manual-follow-up"
  ]),
  evidenceKind: z.enum(["observed", "interpreted"]),
  title: z.string(),
  summary: z.string(),
  recommendation: z.string(),
  confidence: z.number().min(0).max(1)
});

export const analyzeRunResponseSchema = z.object({
  insights: z.array(analyzedInsightSchema)
});

export type AnalyzeRunResponse = z.infer<typeof analyzeRunResponseSchema>;

// ---------------------------------------------------------------------------
// QaLlmClient interface
// ---------------------------------------------------------------------------

export interface QaLlmClient {
  normalizeSteps(input: NormalizeStepsInput): Promise<LlmCapabilityResult<NormalizeStepsResponse>>;
  generateScenarios(input: GenerateScenariosLlmInput): Promise<LlmCapabilityResult<GenerateScenariosLlmResponse>>;
  analyzeRun(input: AnalyzeRunInput): Promise<LlmCapabilityResult<AnalyzeRunResponse>>;
}
