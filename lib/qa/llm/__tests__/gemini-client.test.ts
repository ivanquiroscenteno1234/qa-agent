import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mock refs so they are available inside vi.mock factory
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn()
}));

// Mock the Google Generative AI SDK before importing GeminiClient
vi.mock("@google/generative-ai", () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

import { GeminiClient } from "@/lib/qa/llm/gemini-client";

function setModelResponse(jsonText: string) {
  mockGenerateContent.mockResolvedValueOnce({
    response: { text: () => jsonText }
  });
}

describe("GeminiClient", () => {
  let client: GeminiClient;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.warn from fallback-path tests to avoid stderr noise
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    client = new GeminiClient("test-api-key", "gemini-2.5-flash");
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe("normalizeSteps", () => {
    it("returns source:llm when model response passes Zod validation", async () => {
      const validResponse = JSON.stringify({
        steps: [
          {
            index: 0,
            rawText: "Go to the login page",
            normalizedText: "Navigate to /login",
            actionType: "navigate",
            targetDescription: "/login"
          }
        ]
      });
      setModelResponse(validResponse);

      const result = await client.normalizeSteps({ rawSteps: ["Go to the login page"] });
      expect(result.source).toBe("llm");
      expect(result.data.steps).toHaveLength(1);
      expect(result.data.steps[0].actionType).toBe("navigate");
    });

    it("returns source:deterministic when model response fails Zod validation", async () => {
      // Missing required fields in the response
      setModelResponse(JSON.stringify({ steps: [{ badField: "value" }] }));

      const result = await client.normalizeSteps({ rawSteps: ["Do something"] });
      expect(result.source).toBe("deterministic");
      expect(result.data.steps[0].rawText).toBe("Do something");
    });

    it("returns source:deterministic when model emits an action type the executor does not support", async () => {
      setModelResponse(
        JSON.stringify({
          steps: [
            {
              index: 0,
              rawText: "Fill the login form",
              normalizedText: "Fill the login form",
              actionType: "fill",
              targetDescription: "Login form"
            }
          ]
        })
      );

      const result = await client.normalizeSteps({ rawSteps: ["Fill the login form"] });
      expect(result.source).toBe("deterministic");
      expect(result.data.steps[0].actionType).toBe("observe");
    });

    it("returns source:deterministic when SDK throws", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.normalizeSteps({ rawSteps: ["Click the button"] });
      expect(result.source).toBe("deterministic");
    });
  });

  describe("generateScenarios", () => {
    it("returns source:llm with parsed scenarios on valid response", async () => {
      const validResponse = JSON.stringify({
        scenarios: [
          {
            title: "Happy path login",
            type: "happy-path",
            priority: "P0",
            steps: ["Navigate to /login", "Fill credentials", "Submit form"],
            expectedResult: "User is authenticated",
            riskRationale: "Login is a critical path"
          }
        ]
      });
      setModelResponse(validResponse);

      const result = await client.generateScenarios({
        featureArea: "Login",
        role: "operator",
        objective: "Test login flow",
        targetUrl: "https://example.com",
        parsedStepSummary: "navigate to login, fill form",
        discoverySurface: ["Login", "Dashboard"],
        riskLevel: "high"
      });

      expect(result.source).toBe("llm");
      expect(result.data.scenarios).toHaveLength(1);
    });

    it("returns source:deterministic on invalid response", async () => {
      setModelResponse(JSON.stringify({ scenarios: [{ missing: "fields" }] }));

      const result = await client.generateScenarios({
        featureArea: "Login",
        role: "user",
        objective: "test",
        targetUrl: "https://example.com",
        parsedStepSummary: "",
        discoverySurface: [],
        riskLevel: "low"
      });

      expect(result.source).toBe("deterministic");
      expect(result.data.scenarios).toHaveLength(0);
    });
  });

  describe("analyzeRun", () => {
    it("returns source:llm with insights on valid response", async () => {
      const validResponse = JSON.stringify({
        insights: [
          {
            category: "defect-candidate",
            evidenceKind: "observed",
            title: "Login form missing error feedback",
            summary: "No error message shown on failed login",
            recommendation: "Add visible inline error messages",
            confidence: 0.9
          }
        ]
      });
      setModelResponse(validResponse);

      const result = await client.analyzeRun({
        featureArea: "Login",
        mode: "exploratory-session",
        stepResults: [],
        warnings: [],
        discoverySurface: []
      });

      expect(result.source).toBe("llm");
      expect(result.data.insights).toHaveLength(1);
      expect(result.data.insights[0].category).toBe("defect-candidate");
    });

    it("returns source:deterministic and empty insights when SDK throws", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Quota exceeded"));

      const result = await client.analyzeRun({
        featureArea: "Dashboard",
        mode: "regression-run",
        stepResults: [],
        warnings: [],
        discoverySurface: []
      });

      expect(result.source).toBe("deterministic");
      expect(result.data.insights).toHaveLength(0);
    });

    it("redacts API key from error messages in console.warn", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Invalid key: test-api-key was rejected"));

      await client.analyzeRun({
        featureArea: "X",
        mode: "exploratory-session",
        stepResults: [],
        warnings: [],
        discoverySurface: []
      });

      const warnMessage = warnSpy.mock.calls[0]?.join(" ") ?? "";
      expect(warnMessage).not.toContain("test-api-key");
    });

    it("redacts API key embedded in a model response body error", async () => {
      // Simulate SDK echoing the API key in a verbose error response body
      mockGenerateContent.mockRejectedValueOnce(
        new Error('{"error":{"code":400,"message":"API key test-api-key is invalid","status":"INVALID_ARGUMENT"}}')
      );

      await client.analyzeRun({
        featureArea: "Y",
        mode: "exploratory-session",
        stepResults: [],
        warnings: [],
        discoverySurface: []
      });

      const warnMessage = warnSpy.mock.calls[0]?.join(" ") ?? "";
      expect(warnMessage).not.toContain("test-api-key");
      expect(warnMessage).toContain("[REDACTED]");
    });
  });

  describe("normalizeSteps error sanitization", () => {
    it("redacts API key from normalizeSteps error messages", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Request failed with key test-api-key"));

      await client.normalizeSteps({ rawSteps: ["Click submit"] });

      const warnMessage = warnSpy.mock.calls[0]?.join(" ") ?? "";
      expect(warnMessage).not.toContain("test-api-key");
      expect(warnMessage).toContain("[REDACTED]");
    });

    it("redacts API key from generateScenarios error messages", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Auth failed: test-api-key not authorized"));

      await client.generateScenarios({
        featureArea: "Login",
        role: "user",
        objective: "test",
        targetUrl: "https://example.com",
        parsedStepSummary: "",
        discoverySurface: [],
        riskLevel: "low"
      });

      const warnMessage = warnSpy.mock.calls[0]?.join(" ") ?? "";
      expect(warnMessage).not.toContain("test-api-key");
      expect(warnMessage).toContain("[REDACTED]");
    });
  });
});
