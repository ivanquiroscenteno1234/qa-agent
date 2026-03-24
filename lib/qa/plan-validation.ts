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

function isLocalTarget(targetUrl: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(targetUrl);
}

function isProductionLikeEnvironment(environment: string, targetUrl: string): boolean {
  return /prod/i.test(environment) || !isLocalTarget(targetUrl);
}

export function buildRunPlanWarnings(plan: RunPlan): string[] {
  const warnings: string[] = [];
  const hasCredentials = Boolean(plan.loginEmail.trim() || plan.loginPassword.trim());

  if (!plan.headless && hasCredentials && isProductionLikeEnvironment(plan.environment, plan.targetUrl)) {
    warnings.push("Visible browser mode with supplied credentials on a non-local target can expose sensitive test data on screen. Prefer headless mode or test-only accounts.");
  }

  if (!plan.safeMode && hasCredentials) {
    warnings.push("Interactive mode with supplied credentials may perform live write actions. Confirm the target environment and account are safe for mutation.");
  }

  return warnings;
}

export function validateRunPlanForMode(plan: RunPlan): ApiErrorShape | null {
  const trimmedSteps = plan.stepsText.trim();

  if (plan.mode === "execute-steps" && !trimmedSteps) {
    return {
      code: "STEPS_REQUIRED",
      message: "Execute Steps mode requires plain-text steps.",
      details: ["Provide at least one executable step or switch to Exploratory Session mode."]
    };
  }

  if (plan.mode === "execute-and-expand" && !trimmedSteps) {
    return {
      code: "SEED_STEPS_REQUIRED",
      message: "Execute And Expand mode requires initial steps to expand from.",
      details: ["Add a seed flow in Plain-Text Steps before creating the run."]
    };
  }

  if (plan.mode === "regression-run" && !(plan.scenarioLibraryId ?? "").trim()) {
    return {
      code: "SCENARIO_LIBRARY_REQUIRED",
      message: "Regression Run mode requires a saved scenario library.",
      details: ["Select a saved scenario library or create one from an exploratory run first."]
    };
  }

  if (!plan.targetUrl.trim()) {
    return {
      code: "TARGET_URL_REQUIRED",
      message: "Target URL is required.",
      details: ["Provide the environment URL to test."]
    };
  }

  return null;
}

export function formatZodError(error: z.ZodError): ApiErrorShape {
  return {
    code: "INVALID_REQUEST",
    message: "The request payload is invalid.",
    details: error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
  };
}