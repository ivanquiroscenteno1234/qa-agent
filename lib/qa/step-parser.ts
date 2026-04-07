import type { ActionType, ParseStepsResponse, ParsedStep, RiskLevel } from "@/lib/types";
import { normalizeParsedSteps } from "@/lib/qa/llm/step-normalization";
import { createId, splitSteps } from "@/lib/qa/utils";

function normalizeTargetText(value: string): string {
  return value.trim().replace(/[.,;:!?]+$/, "");
}

function classifyRisk(line: string): RiskLevel {
  const normalized = line.toLowerCase();

  if (/(delete|remove|permission|role|payment|submit|publish|save)/.test(normalized)) {
    return "high";
  }

  if (/(login|edit|update|upload|workflow)/.test(normalized)) {
    return "moderate";
  }

  return "low";
}

function inferActionType(line: string): ActionType {
  const normalized = line.toLowerCase();

  if (normalized.includes("login") || normalized.includes("sign in")) {
    return "login";
  }

  if (normalized.includes("left side") || normalized.includes("menu view") || normalized.includes("navigation")) {
    return "open-navigation";
  }

  if (normalized.startsWith("go to") || normalized.includes("site") || normalized.includes("url")) {
    return "navigate";
  }

  if (
    normalized.startsWith("open") &&
    /(landing page|home page|homepage|start page|main page|application|app|website)/.test(normalized)
  ) {
    return "navigate";
  }

  if (normalized.includes("open") || normalized.includes("section")) {
    return "open-section";
  }

  if (normalized.includes("edit")) {
    return "assert-editable";
  }

  if (normalized.includes("visible") || normalized.includes("see")) {
    return "assert-visible";
  }

  return "observe";
}

function inferTarget(line: string): string {
  const quoted = line.match(/"([^"]+)"/);

  if (quoted) {
    return normalizeTargetText(quoted[1]);
  }

  if (/menu view|left side|navigation/i.test(line)) {
    return "Menu";
  }

  const url = line.match(/https?:\/\/\S+|\b[a-z0-9.-]+\.[a-z]{2,}\b/i);

  if (url) {
    return normalizeTargetText(url[0]);
  }

  return normalizeTargetText(line.replace(/^(go to|open|make sure|login using|go|click)\s+/i, "").trim());
}

function inferExpectedResult(actionType: ActionType, line: string): string {
  if (actionType === "assert-editable") {
    return "Edit controls should be actionable for the active role.";
  }

  if (actionType === "login") {
    return "User should authenticate successfully and land on an authorized page.";
  }

  if (actionType === "navigate") {
    return "Application should load the requested page without blocking errors.";
  }

  return line;
}

export function parsePlainTextSteps(stepsText: string): ParseStepsResponse {
  const lines = splitSteps(stepsText);

  const parsedSteps: ParsedStep[] = lines.map((line) => {
    const actionType = inferActionType(line);

    return {
      id: createId("step"),
      rawText: line,
      actionType,
      targetDescription: inferTarget(line),
      expectedResult: inferExpectedResult(actionType, line),
      fallbackInterpretation:
        "Prefer user-facing labels, local menu context, and safe read-first observation before retrying.",
      riskClassification: classifyRisk(line)
    };
  });

  const assumptions: string[] = [];
  const ambiguities: string[] = [];

  if (!lines.length) {
    ambiguities.push("No executable steps were provided.");
  }

  if (!lines.some((line) => /login|sign in/i.test(line))) {
    assumptions.push("The flow may not require authentication, or the user omitted login steps.");
  }

  if (lines.some((line) => /password\d*|testuser/i.test(line))) {
    assumptions.push("Raw credentials should be replaced with a credential reference before production use.");
  }

  if (parsedSteps.some((step) => step.actionType === "observe")) {
    ambiguities.push("One or more steps were interpreted as generic observation because the action was not explicit.");
  }

  return {
    parsedSteps,
    assumptions,
    ambiguities
  };
}

/**
 * Async variant: runs the heuristic parser then optionally passes the result
 * through the LLM step normalization module (gated by QA_LLM_STEP_PARSING).
 * The API route and any server-side caller that wants LLM assistance should
 * use this function. Execution-critical paths that need synchronous parsing
 * can continue using parsePlainTextSteps directly.
 */
export async function parseStepsWithLlm(stepsText: string, context?: string): Promise<ParseStepsResponse> {
  const base = parsePlainTextSteps(stepsText);
  const normalized = await normalizeParsedSteps(base.parsedSteps, context);
  return { ...base, parsedSteps: normalized };
}