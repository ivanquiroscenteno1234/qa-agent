/**
 * Centralized LLM prompt templates for the QA agent.
 *
 * Each template is a typed builder function that accepts structured input and
 * returns a complete prompt string. All prompts are versioned by the
 * PROMPT_VERSION constant at the top of each section.
 *
 * Language note: the current target domain is a Spanish/English bilingual
 * restaurant management platform. Prompts should handle mixed-language UI
 * labels gracefully.
 */

import { supportedNormalizedStepActionTypes } from "@/lib/qa/llm/types";

function sanitizePromptText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/password\s*[:=]?\s*[^\s]+/gi, "password [REDACTED]")
    .replace(/token\s*[:=]?\s*[^\s]+/gi, "token [REDACTED]")
    .replace(/apikey\s*[:=]?\s*[^\s]+/gi, "apikey [REDACTED]")
    .replace(/zxcvFDSAqwer1234@/g, "[REDACTED_SECRET]");
}

function sanitizePromptList(values: string[]): string[] {
  return values.map((value) => sanitizePromptText(value));
}

// ---------------------------------------------------------------------------
// Step normalization prompt  (last validated: 2026-03-27)
// ---------------------------------------------------------------------------

export const STEP_NORMALIZATION_PROMPT_VERSION = "1.0.0";

export interface StepNormalizationPromptInput {
  rawSteps: string[];
  context?: string;
}

export function buildStepNormalizationPrompt(input: StepNormalizationPromptInput): string {
  const safeSteps = sanitizePromptList(input.rawSteps);
  const safeContext = input.context ? sanitizePromptText(input.context) : undefined;
  const stepList = safeSteps
    .map((step, idx) => `${idx + 1}. ${step}`)
    .join("\n");

  const contextBlock = safeContext
    ? `\nContext about the application under test:\n${safeContext}\n`
    : "";
  const actionTypeList = supportedNormalizedStepActionTypes.join(" | ");

  return `You are a QA automation assistant. Normalize the following test steps into structured, machine-executable actions.${contextBlock}

For each step, produce a JSON object with these fields:
- index (0-based integer matching the input order)
- rawText (the original step text, unchanged)
- normalizedText (a clearer rewrite of the step for automation)
- actionType: one of ${actionTypeList}
- targetDescription (the UI element or URL the action targets)
- expectedResult (optional, what a passing step should produce)

Return ONLY a JSON object in this exact shape:
{ "steps": [ ...normalizedStep objects ] }

Do not include markdown fences or any text outside the JSON object.

Steps to normalize:
${stepList}`;
}

// ---------------------------------------------------------------------------
// Scenario generation prompt  (last validated: 2026-03-27)
// ---------------------------------------------------------------------------

export const SCENARIO_GENERATION_PROMPT_VERSION = "1.0.0";

export interface ScenarioGenerationPromptInput {
  featureArea: string;
  role: string;
  objective: string;
  targetUrl: string;
  parsedStepSummary: string;
  discoverySurface: string[];
  riskLevel: string;
}

export function buildScenarioGenerationPrompt(input: ScenarioGenerationPromptInput): string {
  const surfaceList = input.discoverySurface.length
    ? sanitizePromptList(input.discoverySurface).map((s) => `- ${s}`).join("\n")
    : "- (no discovery surface data available)";
  const featureArea = sanitizePromptText(input.featureArea);
  const role = sanitizePromptText(input.role);
  const objective = sanitizePromptText(input.objective);
  const targetUrl = sanitizePromptText(input.targetUrl);
  const riskLevel = sanitizePromptText(input.riskLevel);
  const parsedStepSummary = sanitizePromptText(input.parsedStepSummary);

  return `You are a senior QA engineer generating test scenarios for a restaurant management platform (Spanish/English bilingual UI).

Feature area: ${featureArea}
Role under test: ${role}
Objective: ${objective}
Target URL: ${targetUrl}
Risk level: ${riskLevel}

Discovered UI surface:
${surfaceList}

Parsed step summary:
${parsedStepSummary}

Generate 3 to 6 diverse test scenarios covering: happy path, negative cases, boundary conditions, and permissions.

Return ONLY a JSON object in this exact shape:
{
  "scenarios": [
    {
      "title": "string",
      "type": "happy-path" | "negative" | "boundary" | "permissions" | "state-transition" | "regression" | "exploratory",
      "priority": "P0" | "P1" | "P2",
      "steps": ["step 1", "step 2", ...],
      "expectedResult": "string",
      "riskRationale": "string"
    }
  ]
}

Do not include markdown fences or any text outside the JSON object.`;
}

// ---------------------------------------------------------------------------
// Review analysis prompt  (last validated: 2026-03-27)
// ---------------------------------------------------------------------------

export const REVIEW_ANALYSIS_PROMPT_VERSION = "1.0.0";

export interface ReviewAnalysisPromptInput {
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

export function buildReviewAnalysisPrompt(input: ReviewAnalysisPromptInput): string {
  const stepSummary = input.stepResults
    .map(
      (s) =>
        `Step ${s.stepNumber} [${sanitizePromptText(s.assertionResult)}]: ${sanitizePromptText(s.userStepText)} → ${sanitizePromptText(s.actionResult)}${s.notes ? ` (${sanitizePromptText(s.notes)})` : ""}`
    )
    .join("\n");

  const warningSummary = input.warnings.length
    ? input.warnings.map((w) => `- [${sanitizePromptText(w.category ?? "general")}] ${sanitizePromptText(w.message)}`).join("\n")
    : "- none";

  const surfaceList = input.discoverySurface.length
    ? sanitizePromptList(input.discoverySurface).map((s) => `- ${s}`).join("\n")
    : "- (no discovery surface data)";
  const featureArea = sanitizePromptText(input.featureArea);
  const mode = sanitizePromptText(input.mode);

  return `You are a QA analysis assistant reviewing a completed test run on a restaurant management platform (Spanish/English bilingual UI).

Feature area: ${featureArea}
Run mode: ${mode}

Step results:
${stepSummary}

Warnings emitted during the run:
${warningSummary}

Discovered UI surface:
${surfaceList}

Analyze the run and produce actionable QA insights. Focus on: usability risks, missing labels, inconsistent language, defect candidates, and items requiring manual follow-up.

Return ONLY a JSON object in this exact shape:
{
  "insights": [
    {
      "category": "intended-flow" | "usability-risk" | "missing-label" | "inconsistent-language" | "defect-candidate" | "manual-follow-up",
      "evidenceKind": "observed" | "interpreted",
      "title": "string",
      "summary": "string",
      "recommendation": "string",
      "confidence": 0.0 to 1.0
    }
  ]
}

Do not include markdown fences or any text outside the JSON object.`;
}
