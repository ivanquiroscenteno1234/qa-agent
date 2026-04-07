import { SchemaType } from "@google/generative-ai";

import type { ActionType, ParseStepsResponse, ParsedStep, RiskLevel } from "@/lib/types";
import { createId, splitSteps } from "@/lib/qa/utils";
import { generateStructuredContent } from "@/lib/qa/llm/client";
import { getQaLlmConfig } from "@/lib/qa/llm/config";

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

export async function parsePlainTextSteps(stepsText: string): Promise<ParseStepsResponse> {
  const config = getQaLlmConfig();

  if (config.enabled && config.features.stepParsing) {
    const response = await generateStructuredContent<ParseStepsResponse>(
      `Parse the following plain text testing steps into structured actionable steps:\n\n${stepsText}`,
      {
        type: SchemaType.OBJECT,
        properties: {
          parsedSteps: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                rawText: { type: SchemaType.STRING, description: "The original line of text from the steps." },
                actionType: { type: SchemaType.STRING, description: "The inferred action type: navigate, login, open-navigation, open-section, assert-editable, fill, click, assert-visible, assert-url, or observe" },
                targetDescription: { type: SchemaType.STRING, description: "The inferred target element, text, or url" },
                inputData: { type: SchemaType.STRING, description: "Any data to input if the action is fill/login" },
                expectedResult: { type: SchemaType.STRING, description: "The expected result of the step." },
                fallbackInterpretation: { type: SchemaType.STRING, description: "A safe fallback description for standard observation." },
                riskClassification: { type: SchemaType.STRING, description: "low, moderate, or high risk" },
              },
              required: ["rawText", "actionType", "targetDescription", "expectedResult", "fallbackInterpretation", "riskClassification"]
            }
          },
          assumptions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          },
          ambiguities: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ["parsedSteps", "assumptions", "ambiguities"]
      },
      "You are a QA automation expert. Parse natural language test steps into structured steps. Determine the most accurate 'actionType' from the user's intent. If there's an ambiguity or missing detail, document it in 'ambiguities' or 'assumptions'."
    );

    if (response) {
      return {
        parsedSteps: response.parsedSteps.map(step => ({
          ...step,
          id: createId("step"),
        })) as ParsedStep[],
        assumptions: response.assumptions || [],
        ambiguities: response.ambiguities || []
      };
    }
  }

  // Deterministic fallback
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