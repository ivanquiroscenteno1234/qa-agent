import { describe, it, expect } from "vitest";
import {
  isRunActive,
  buildMonitorSummary,
  buildRunListItems,
  buildReviewComparison,
  buildRunProvenanceSummary,
} from "../run-view-model";
import type { RunSummary, RunRecord, RunStatus } from "@/lib/types";

function createMockRunSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    id: "run-id",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    plan: {
      environment: "production",
      targetUrl: "https://example.com",
      featureArea: "Auth",
      mode: "execute-steps",
      browser: "chromium",
      role: "admin",
      scenarioLibraryId: "lib-1",
    },
    status: "pass",
    currentPhase: "reporting",
    summary: "Test summary",
    counts: {
      parsedSteps: 5,
      generatedScenarios: 2,
      stepResults: 5,
      artifacts: 1,
      defects: 0,
    },
    ...overrides,
  };
}

function createMockRunRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run-id",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    plan: {
      environment: "production",
      targetUrl: "https://example.com",
      featureArea: "Auth",
      objective: "Test objective",
      mode: "execute-steps",
      browser: "chromium",
      device: "Desktop",
      headless: true,
      role: "admin",
      credentialReference: "cred-1",
      loginEmail: "admin@example.com",
      loginPassword: "password",
      buildVersion: "1.0.0",
      timeboxMinutes: 10,
      riskLevel: "low",
      safeMode: true,
      stepsText: "step 1",
      expectedOutcomes: "outcome 1",
      prerequisites: "none",
      cleanupInstructions: "none",
      acceptanceCriteria: "criteria",
      riskFocus: ["auth"],
    },
    parsedSteps: [],
    generatedScenarios: [],
    status: "pass",
    currentPhase: "reporting",
    summary: "Test summary",
    riskSummary: [],
    coverageGaps: [],
    stepResults: [],
    artifacts: [],
    defects: [],
    analysisInsights: [],
    events: [],
    warnings: [],
    ...overrides,
  };
}

describe("Run View Model", () => {
  describe("isRunActive", () => {
    it("should return true for queued status", () => {
      expect(isRunActive("queued")).toBe(true);
    });

    it("should return true for running status", () => {
      expect(isRunActive("running")).toBe(true);
    });

    it("should return false for other statuses", () => {
      const inactiveStatuses: RunStatus[] = ["draft", "pass", "fail", "blocked", "cancelled", "inconclusive"];
      inactiveStatuses.forEach((status) => {
        expect(isRunActive(status)).toBe(false);
      });
    });
  });

  describe("buildMonitorSummary", () => {
    it("should return zeros for an empty list", () => {
      const summary = buildMonitorSummary([]);
      expect(summary).toEqual({
        activeRuns: 0,
        queuedRuns: 0,
        draftRuns: 0,
        completedRuns: 0,
      });
    });

    it("should correctly count runs in various statuses", () => {
      const runs = [
        createMockRunSummary({ status: "queued" }),
        createMockRunSummary({ status: "queued" }),
        createMockRunSummary({ status: "running" }),
        createMockRunSummary({ status: "draft" }),
        createMockRunSummary({ status: "pass" }),
        createMockRunSummary({ status: "fail" }),
        createMockRunSummary({ status: "blocked" }),
      ];

      const summary = buildMonitorSummary(runs);
      expect(summary).toEqual({
        activeRuns: 3, // 2 queued + 1 running
        queuedRuns: 2,
        draftRuns: 1,
        completedRuns: 3, // pass + fail + blocked
      });
    });
  });

  describe("buildRunListItems", () => {
    it("should transform RunSummary to RunListItemViewModel", () => {
      const runs = [
        createMockRunSummary({
          id: "run-1",
          plan: {
            environment: "staging",
            targetUrl: "https://staging.com",
            featureArea: "Checkout",
            mode: "execute-steps",
            browser: "firefox",
            role: "user",
            scenarioLibraryId: "lib-1",
          },
          status: "pass",
          createdAt: "2024-01-01T15:30:00Z",
        }),
      ];

      const items = buildRunListItems(runs);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: "run-1",
        featureArea: "Checkout",
        subtitle: "execute-steps / staging",
        status: "pass",
        progress: 100,
        role: "user",
      });
      // createdAtLabel will depend on local time, but we can check if it's a string
      expect(typeof items[0].createdAtLabel).toBe("string");
    });

    describe("deriveProgress", () => {
      it("should return null for draft runs", () => {
        const runs = [createMockRunSummary({ status: "draft" })];
        const items = buildRunListItems(runs);
        expect(items[0].progress).toBeNull();
      });

      it("should return 100 for completed runs", () => {
        const runs = [
          createMockRunSummary({ status: "pass" }),
          createMockRunSummary({ status: "fail" }),
        ];
        const items = buildRunListItems(runs);
        expect(items[0].progress).toBe(100);
        expect(items[1].progress).toBe(100);
      });

      it("should calculate progress for active runs", () => {
        const runs = [
          createMockRunSummary({
            status: "running",
            counts: {
              parsedSteps: 10,
              generatedScenarios: 0,
              stepResults: 5,
              artifacts: 0,
              defects: 0,
            },
          }),
        ];
        const items = buildRunListItems(runs);
        // (5 / 10) * 100 = 50
        expect(items[0].progress).toBe(50);
      });

      it("should cap progress between 8% and 95% for active runs", () => {
        const runs = [
          createMockRunSummary({
            status: "running",
            counts: {
              parsedSteps: 100,
              generatedScenarios: 0,
              stepResults: 1, // 1%
              artifacts: 0,
              defects: 0,
            },
          }),
          createMockRunSummary({
            status: "running",
            counts: {
              parsedSteps: 100,
              generatedScenarios: 0,
              stepResults: 99, // 99%
              artifacts: 0,
              defects: 0,
            },
          }),
        ];
        const items = buildRunListItems(runs);
        expect(items[0].progress).toBe(8);
        expect(items[1].progress).toBe(95);
      });

      it("should handle baseline of 1 when counts are 0", () => {
        const runs = [
          createMockRunSummary({
            status: "running",
            counts: {
              parsedSteps: 0,
              generatedScenarios: 0,
              stepResults: 0,
              artifacts: 0,
              defects: 0,
            },
          }),
        ];
        const items = buildRunListItems(runs);
        // (0 / 1) * 100 = 0 -> capped at 8
        expect(items[0].progress).toBe(8);
      });
    });
  });

  describe("buildReviewComparison", () => {
    it("should return default values when selectedRun is null", () => {
      const result = buildReviewComparison(null, []);
      expect(result.previousComparableRun).toBeNull();
      expect(result.comparisonDelta).toBeNull();
      expect(result.scenarioValue).toBe("0");
    });

    it("should return no baseline info when no comparable run exists", () => {
      const selectedRun = createMockRunRecord({ id: "current" });
      const result = buildReviewComparison(selectedRun, []);
      expect(result.previousComparableRun).toBeNull();
      expect(result.scenarioDetail).toBe("No earlier comparable baseline");
    });

    it("should find the previous comparable run and calculate deltas", () => {
      const previousRun = createMockRunSummary({
        id: "prev",
        createdAt: "2024-01-01T09:00:00Z",
        status: "pass",
        counts: {
          generatedScenarios: 5,
          defects: 2,
          artifacts: 10,
          stepResults: 20,
          parsedSteps: 20,
        },
      });

      const selectedRun = createMockRunRecord({
        id: "current",
        createdAt: "2024-01-01T10:00:00Z",
        generatedScenarios: new Array(8).fill({}),
        defects: new Array(1).fill({}),
        artifacts: new Array(15).fill({}),
        stepResults: new Array(25).fill({}),
      });

      const result = buildReviewComparison(selectedRun, [previousRun]);

      expect(result.previousComparableRun?.id).toBe("prev");
      expect(result.comparisonDelta).toEqual({
        scenarioDelta: 3, // 8 - 5
        defectDelta: -1, // 1 - 2
        artifactDelta: 5, // 15 - 10
        stepDelta: 5, // 25 - 20
      });

      expect(result.scenarioDetail).toBe("+3 vs baseline 5");
      expect(result.defectDetail).toBe("-1 vs baseline 2");
    });
  });

  describe("buildRunProvenanceSummary", () => {
    it("should return unknown when llmMetadata is missing", () => {
      const run = createMockRunRecord({ llmMetadata: undefined });
      const summary = buildRunProvenanceSummary(run);
      expect(summary).toEqual({
        stepParsing: "unknown",
        scenarioGeneration: "unknown",
        reviewAnalysis: "unknown",
        hasLlmAssistance: false,
      });
    });

    it("should correctly identify LLM assistance", () => {
      const run = createMockRunRecord({
        llmMetadata: {
          stepParsing: "llm",
          scenarioGeneration: "deterministic",
          reviewAnalysis: "heuristic",
        },
      });
      const summary = buildRunProvenanceSummary(run);
      expect(summary.hasLlmAssistance).toBe(true);
      expect(summary.stepParsing).toBe("llm");
    });

    it("should return false for hasLlmAssistance if everything is heuristic/deterministic", () => {
      const run = createMockRunRecord({
        llmMetadata: {
          stepParsing: "heuristic",
          scenarioGeneration: "deterministic",
          reviewAnalysis: "heuristic",
        },
      });
      const summary = buildRunProvenanceSummary(run);
      expect(summary.hasLlmAssistance).toBe(false);
    });
  });
});
