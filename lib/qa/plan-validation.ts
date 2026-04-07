import { z } from "zod";

import type { RunPlan } from "@/lib/types";

export const runPlanSchema = z.object({
  environment: z.string(),
  targetUrl: z.string(),
  featureArea: z.string(),
  objective: z.string(),
  mode: z.enum([
    "execute-steps",
    "generate-scenarios",
    "execute-and-expand",
    "exploratory-session",
    "regression-run"
  ]),
  browser: z.string(),
  device: z.string(),
  headless: z.boolean(),
  role: z.string(),
  environmentLibraryId: z.string().optional(),
  credentialLibraryId: z.string().optional(),
  credentialReference: z.string(),
  loginEmail: z.string(),
  loginPassword: z.string(),
  scenarioLibraryId: z.string().optional(),
  buildVersion: z.string(),
  timeboxMinutes: z.number().int().positive(),
  riskLevel: z.enum(["low", "moderate", "high"]),
  safeMode: z.boolean(),
  stepsText: z.string(),
  expectedOutcomes: z.string(),
  prerequisites: z.string(),
  cleanupInstructions: z.string(),
  acceptanceCriteria: z.string(),
  riskFocus: z.array(z.string())
});

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: string[];
}

export function isLocalTarget(targetUrl: string): boolean {
  const localPattern = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;
  try {
    const parsed = new URL(targetUrl);
    return localPattern.test(parsed.hostname);
  } catch {
    return localPattern.test(targetUrl);
  }
}

export function isValidTargetUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isProductionLikeEnvironment(environment: string, targetUrl: string): boolean {
  return /prod/i.test(environment) || !isLocalTarget(targetUrl);
}

export function buildRunPlanWarnings(plan: RunPlan): string[] {
  const warnings: string[] = [];
  const hasCredentials = Boolean(
    plan.loginEmail.trim() ||
      plan.loginPassword.trim() ||
      (plan.credentialLibraryId ?? "").trim() ||
      plan.credentialReference.trim()
  );

  if (!plan.headless && hasCredentials && isProductionLikeEnvironment(plan.environment, plan.targetUrl)) {
    warnings.push("Visible browser mode with supplied credentials on a non-local target can expose sensitive test data on screen. Prefer headless mode or test-only accounts.");
  }

  if (!plan.safeMode && hasCredentials) {
    warnings.push("Interactive mode with supplied credentials may perform live write actions. Confirm the target environment and account are safe for mutation.");
  }

  return warnings;
}

export function validateRunPlanForMode(plan: RunPlan): ApiErrorShape | null {
  return getRunPlanValidationErrors(plan)[0] ?? null;
}

export function validateScenarioGenerationPlan(plan: RunPlan): ApiErrorShape | null {
  return getScenarioGenerationValidationErrors(plan)[0] ?? null;
}

export function validateParsePlan(plan: RunPlan): ApiErrorShape | null {
  return getParseValidationErrors(plan)[0] ?? null;
}

export function getRunPlanValidationErrors(plan: RunPlan): ApiErrorShape[] {
  const trimmedSteps = plan.stepsText.trim();
  const trimmedTargetUrl = plan.targetUrl.trim();
  const hasInlineEmail = Boolean(plan.loginEmail.trim());
  const hasInlinePassword = Boolean(plan.loginPassword.trim());
  const validationErrors: ApiErrorShape[] = [];

  if (!trimmedTargetUrl) {
    validationErrors.push({
      code: "TARGET_URL_REQUIRED",
      message: "Target URL is required.",
      details: ["Provide the environment URL to test."]
    });
  } else if (!isValidTargetUrl(trimmedTargetUrl)) {
    validationErrors.push({
      code: "TARGET_URL_INVALID",
      message: "Target URL must be a valid http:// or https:// address.",
      details: ["Use a fully qualified URL such as https://example.com."]
    });
  }

  if (hasInlineEmail !== hasInlinePassword) {
    validationErrors.push({
      code: "INLINE_CREDENTIALS_INCOMPLETE",
      message: "Inline credentials must include both login email and login password.",
      details: ["Clear the partial inline credential or provide both fields."]
    });
  }

  if (plan.mode === "execute-steps" && !trimmedSteps) {
    validationErrors.push({
      code: "STEPS_REQUIRED",
      message: "Execute Steps mode requires plain-text steps.",
      details: ["Provide at least one executable step or switch to Exploratory Session mode."]
    });
  }

  if (plan.mode === "execute-and-expand" && !trimmedSteps) {
    validationErrors.push({
      code: "SEED_STEPS_REQUIRED",
      message: "Execute And Expand mode requires initial steps to expand from.",
      details: ["Add a seed flow in Plain-Text Steps before creating the run."]
    });
  }

  if (plan.mode === "regression-run" && !(plan.scenarioLibraryId ?? "").trim()) {
    validationErrors.push({
      code: "SCENARIO_LIBRARY_REQUIRED",
      message: "Regression Run mode requires a saved scenario library.",
      details: ["Select a saved scenario library or create one from an exploratory run first."]
    });
  }

  return validationErrors;
}

export function getScenarioGenerationValidationErrors(plan: RunPlan): ApiErrorShape[] {
  const trimmedSteps = plan.stepsText.trim();
  const trimmedTargetUrl = plan.targetUrl.trim();
  const validationErrors: ApiErrorShape[] = [];

  if (!trimmedTargetUrl) {
    validationErrors.push({
      code: "TARGET_URL_REQUIRED",
      message: "Target URL is required to generate scenarios.",
      details: ["Provide the environment URL so generated scenarios reference the right surface."]
    });
  } else if (!isValidTargetUrl(trimmedTargetUrl)) {
    validationErrors.push({
      code: "TARGET_URL_INVALID",
      message: "Target URL must be a valid http:// or https:// address.",
      details: ["Use a fully qualified URL such as https://example.com."]
    });
  }

  if (plan.mode === "execute-steps" && !trimmedSteps) {
    validationErrors.push({
      code: "STEPS_REQUIRED",
      message: "Execute Steps mode requires plain-text steps before scenario generation.",
      details: ["Provide at least one executable step or switch to Exploratory Session mode."]
    });
  }

  if (plan.mode === "execute-and-expand" && !trimmedSteps) {
    validationErrors.push({
      code: "SEED_STEPS_REQUIRED",
      message: "Execute And Expand mode requires seed steps before scenario generation.",
      details: ["Add a seed flow in Plain-Text Steps before generating scenarios."]
    });
  }

  if (plan.mode === "regression-run" && !(plan.scenarioLibraryId ?? "").trim()) {
    validationErrors.push({
      code: "SCENARIO_LIBRARY_REQUIRED",
      message: "Regression Run mode requires a saved scenario library before scenario generation.",
      details: ["Select a saved scenario library or switch to a non-regression mode."]
    });
  }

  return validationErrors;
}

export function getParseValidationErrors(plan: RunPlan): ApiErrorShape[] {
  const trimmedSteps = plan.stepsText.trim();

  if (!trimmedSteps) {
    return [
      {
        code: "PARSE_STEPS_REQUIRED",
        message: "Plain-text steps are required before parsing.",
        details: ["Add at least one step in Plain-Text Steps to generate a structured interpretation."]
      }
    ];
  }

  return [];
}

export function formatZodError(error: z.ZodError): ApiErrorShape {
  return {
    code: "INVALID_REQUEST",
    message: "The request payload is invalid.",
    details: error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
  };
}