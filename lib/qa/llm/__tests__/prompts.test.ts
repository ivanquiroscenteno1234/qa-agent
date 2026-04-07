import { describe, expect, it } from "vitest";

import {
  buildReviewAnalysisPrompt,
  buildScenarioGenerationPrompt,
  buildStepNormalizationPrompt
} from "@/lib/qa/llm/prompts";

describe("LLM prompt sanitization", () => {
  it("redacts inline credentials from step-normalization prompts", () => {
    const prompt = buildStepNormalizationPrompt({
      rawSteps: ["Login using qa@example.com password hunter2"],
      context: "Environment token=abc123"
    });

    expect(prompt).not.toContain("qa@example.com");
    expect(prompt).not.toContain("hunter2");
    expect(prompt).not.toContain("abc123");
    expect(prompt).toContain("[REDACTED_EMAIL]");
    expect(prompt).toContain("password [REDACTED]");
    expect(prompt).toContain("token [REDACTED]");
  });

  it("redacts sensitive step summaries and discovered labels from scenario-generation prompts", () => {
    const prompt = buildScenarioGenerationPrompt({
      featureArea: "Billing",
      role: "qa@example.com",
      objective: "Verify password=secret and token=xyz are never exposed",
      targetUrl: "https://example.com/app?token=xyz",
      parsedStepSummary: "1. [login] qa@example.com password hunter2",
      discoverySurface: ["User qa@example.com", "Reset token=xyz"],
      riskLevel: "high"
    });

    expect(prompt).not.toContain("qa@example.com");
    expect(prompt).not.toContain("hunter2");
    expect(prompt).not.toContain("token=xyz");
    expect(prompt).toContain("[REDACTED_EMAIL]");
    expect(prompt).toContain("password [REDACTED]");
    expect(prompt).toContain("token [REDACTED]");
  });

  it("redacts sensitive step results and warnings from review-analysis prompts", () => {
    const prompt = buildReviewAnalysisPrompt({
      featureArea: "Auth",
      mode: "regression-run",
      stepResults: [
        {
          stepNumber: 1,
          userStepText: "Login using qa@example.com password hunter2",
          assertionResult: "pass",
          actionResult: "Authenticated as qa@example.com.",
          notes: "token=xyz returned in response"
        }
      ],
      warnings: [{ message: "apikey=secret-key leaked", category: "security" }],
      discoverySurface: ["Welcome qa@example.com"]
    });

    expect(prompt).not.toContain("qa@example.com");
    expect(prompt).not.toContain("hunter2");
    expect(prompt).not.toContain("secret-key");
    expect(prompt).not.toContain("token=xyz");
    expect(prompt).toContain("[REDACTED_EMAIL]");
    expect(prompt).toContain("password [REDACTED]");
    expect(prompt).toContain("apikey [REDACTED]");
    expect(prompt).toContain("token [REDACTED]");
  });
});