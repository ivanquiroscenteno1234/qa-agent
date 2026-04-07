import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { getQaLlmConfig } from "@/lib/qa/llm/config";

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}

describe("getQaLlmConfig", () => {
  it("returns disabled when QA_LLM_ENABLED=false", () => {
    withEnv({ QA_LLM_ENABLED: "false", QA_LLM_PROVIDER: "gemini", GEMINI_API_KEY: "test-key" }, () => {
      const config = getQaLlmConfig();
      expect(config.enabled).toBe(false);
      expect(config.provider).toBe("disabled");
      expect(config.configured).toBe(false);
    });
  });

  it("returns configured:false when QA_LLM_ENABLED=true but API key is missing", () => {
    withEnv({ QA_LLM_ENABLED: "true", QA_LLM_PROVIDER: "gemini", GEMINI_API_KEY: undefined }, () => {
      const config = getQaLlmConfig();
      expect(config.enabled).toBe(true);
      expect(config.configured).toBe(false);
      expect(config.apiKeyPresent).toBe(false);
      expect(config.warning).toBeTruthy();
    });
  });

  it("returns configured:true when enabled, provider=gemini, and API key present", () => {
    withEnv({ QA_LLM_ENABLED: "true", QA_LLM_PROVIDER: "gemini", GEMINI_API_KEY: "my-key" }, () => {
      const config = getQaLlmConfig();
      expect(config.enabled).toBe(true);
      expect(config.configured).toBe(true);
      expect(config.provider).toBe("gemini");
    });
  });

  it("returns configured:false when provider is not gemini", () => {
    withEnv({ QA_LLM_ENABLED: "true", QA_LLM_PROVIDER: "openai", GEMINI_API_KEY: "key" }, () => {
      const config = getQaLlmConfig();
      expect(config.configured).toBe(false);
    });
  });

  it("parses all feature flags independently to booleans", () => {
    withEnv(
      {
        QA_LLM_ENABLED: "true",
        QA_LLM_PROVIDER: "gemini",
        GEMINI_API_KEY: "key",
        QA_LLM_STEP_PARSING: "true",
        QA_LLM_SCENARIO_GENERATION: "false",
        QA_LLM_REVIEW_ANALYSIS: "1"
      },
      () => {
        const config = getQaLlmConfig();
        expect(config.features.stepParsing).toBe(true);
        expect(config.features.scenarioGeneration).toBe(false);
        expect(config.features.reviewAnalysis).toBe(true);
      }
    );
  });

  it("invalid feature flag value falls back to false", () => {
    withEnv(
      {
        QA_LLM_ENABLED: "true",
        QA_LLM_PROVIDER: "gemini",
        GEMINI_API_KEY: "key",
        QA_LLM_STEP_PARSING: "maybe"
      },
      () => {
        const config = getQaLlmConfig();
        expect(config.features.stepParsing).toBe(false);
      }
    );
  });
});
