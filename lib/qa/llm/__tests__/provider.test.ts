import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { resetQaLlmClient, getQaLlmClient } from "@/lib/qa/llm/provider";
import { NoopLlmClient } from "@/lib/qa/llm/noop-client";

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

beforeEach(() => {
  resetQaLlmClient();
});

afterEach(() => {
  resetQaLlmClient();
});

describe("getQaLlmClient", () => {
  it("returns noop client when LLM is disabled", () => {
    withEnv({ QA_LLM_ENABLED: "false" }, () => {
      const client = getQaLlmClient();
      expect(client).toBeInstanceOf(NoopLlmClient);
    });
  });

  it("returns noop client when provider is not gemini", () => {
    withEnv({ QA_LLM_ENABLED: "true", QA_LLM_PROVIDER: "openai", GEMINI_API_KEY: "key" }, () => {
      const client = getQaLlmClient();
      expect(client).toBeInstanceOf(NoopLlmClient);
    });
  });

  it("returns noop client when API key is absent", () => {
    withEnv({ QA_LLM_ENABLED: "true", QA_LLM_PROVIDER: "gemini", GEMINI_API_KEY: undefined }, () => {
      const client = getQaLlmClient();
      expect(client).toBeInstanceOf(NoopLlmClient);
    });
  });
});

describe("NoopLlmClient", () => {
  const noop = new NoopLlmClient();

  it("normalizeSteps returns source:disabled and original input as steps", async () => {
    const result = await noop.normalizeSteps({ rawSteps: ["Open the page", "Click the button"] });
    expect(result.source).toBe("disabled");
    expect(result.data.steps).toHaveLength(2);
    expect(result.data.steps[0].rawText).toBe("Open the page");
  });

  it("generateScenarios returns source:disabled and empty scenarios", async () => {
    const result = await noop.generateScenarios({
      featureArea: "Login",
      role: "admin",
      objective: "Test login",
      targetUrl: "https://example.com",
      parsedStepSummary: "",
      discoverySurface: [],
      riskLevel: "moderate"
    });
    expect(result.source).toBe("disabled");
    expect(result.data.scenarios).toHaveLength(0);
  });

  it("analyzeRun returns source:disabled and empty insights", async () => {
    const result = await noop.analyzeRun({
      featureArea: "Dashboard",
      mode: "exploratory-session",
      stepResults: [],
      warnings: [],
      discoverySurface: []
    });
    expect(result.source).toBe("disabled");
    expect(result.data.insights).toHaveLength(0);
  });

  it("normalizeSteps never throws even with empty input", async () => {
    const result = await noop.normalizeSteps({ rawSteps: [] });
    expect(result.source).toBe("disabled");
    expect(result.data.steps).toHaveLength(0);
  });
});
