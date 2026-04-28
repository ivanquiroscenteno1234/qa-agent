import { describe, it, expect } from "vitest";
import {
  buildCredentialVaultCards,
  buildEnvironmentCards,
} from "../settings-view-model";
import type {
  CredentialLibraryRecord,
  EnvironmentLibraryRecord,
  RunRecord,
  ScenarioLibrary,
} from "@/lib/types";

function createMockCredential(overrides: Partial<CredentialLibraryRecord> = {}): CredentialLibraryRecord {
  return {
    id: "cred-1",
    label: "Default Credential",
    username: "user1",
    secretMode: "stored-secret",
    hasStoredSecret: true,
    status: "active",
    notes: "Notes",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    ...overrides,
  };
}

function createMockRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run-1",
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
      credentialReference: "",
      loginEmail: "",
      loginPassword: "",
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

function createMockEnvironment(overrides: Partial<EnvironmentLibraryRecord> = {}): EnvironmentLibraryRecord {
  return {
    id: "env-1",
    name: "Production",
    targetUrl: "https://example.com",
    environment: "production",
    role: "admin",
    browser: "chromium",
    device: "Desktop",
    safeMode: true,
    riskLevel: "low",
    notes: "Production environment",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    ...overrides,
  };
}

function createMockLibrary(overrides: Partial<ScenarioLibrary> = {}): ScenarioLibrary {
  return {
    id: "lib-1",
    name: "Auth Scenarios",
    status: "active",
    featureArea: "Auth",
    environment: "production",
    targetUrl: "https://example.com",
    role: "admin",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    version: 1,
    versions: [],
    scenarios: [],
    riskSummary: [],
    coverageGaps: [],
    ...overrides,
  };
}

describe("Settings View Model", () => {
  describe("buildCredentialVaultCards", () => {
    it("should return only regular cards when no inline runs exist", () => {
      const credentials = [createMockCredential()];
      const runs = [createMockRun({ plan: { ...createMockRun().plan, credentialLibraryId: "cred-1" } })];

      const cards = buildCredentialVaultCards(credentials, runs);

      expect(cards).toHaveLength(1);
      expect(cards[0].id).toBe("cred-1");
      expect(cards.find(c => c.id === "credential-inline-entry")).toBeUndefined();
    });

    it("should include inline entry card when runs with inline credentials exist", () => {
      const credentials: CredentialLibraryRecord[] = [];
      const runs = [
        createMockRun({
          id: "run-inline",
          plan: { ...createMockRun().plan, loginEmail: "test@example.com" },
          updatedAt: "2024-01-02T10:00:00Z"
        })
      ];

      const cards = buildCredentialVaultCards(credentials, runs);

      expect(cards).toHaveLength(1);
      expect(cards[0].id).toBe("credential-inline-entry");
      expect(cards[0].label).toBe("Inline operator entry");
      expect(cards[0].detail).toContain("1 run captured");
    });

    it("should handle multiple inline runs and pick the latest timestamp", () => {
      const credentials: CredentialLibraryRecord[] = [];
      const runs = [
        createMockRun({
          id: "run-1",
          plan: { ...createMockRun().plan, loginPassword: "pass" },
          updatedAt: "2024-01-01T10:00:00Z"
        }),
        createMockRun({
          id: "run-2",
          plan: { ...createMockRun().plan, loginEmail: "test@example.com" },
          updatedAt: "2024-01-03T10:00:00Z"
        }),
        createMockRun({
          id: "run-3",
          plan: { ...createMockRun().plan, loginPassword: "other" },
          updatedAt: "2024-01-02T10:00:00Z"
        })
      ];

      const cards = buildCredentialVaultCards(credentials, runs);

      expect(cards).toHaveLength(1);
      expect(cards[0].detail).toContain("3 runs captured");
      // The formatting in settings-view-model uses .toLocaleString()
      // which might be environment dependent, but we can check if it exists
      expect(cards[0].lastUsed).not.toBe("No observations yet");
    });

    it("should combine regular credentials and inline entry card", () => {
      const credentials = [createMockCredential({ id: "cred-1" })];
      const runs = [
        createMockRun({ plan: { ...createMockRun().plan, loginEmail: "inline@example.com" } })
      ];

      const cards = buildCredentialVaultCards(credentials, runs);

      expect(cards).toHaveLength(2);
      expect(cards.map(c => c.id)).toContain("cred-1");
      expect(cards.map(c => c.id)).toContain("credential-inline-entry");
    });
  });

  describe("buildEnvironmentCards", () => {
    it("should correctly map environment records", () => {
      const environments = [
        createMockEnvironment({ id: "env-1", name: "Env 1" }),
        createMockEnvironment({ id: "env-2", name: "Env 2" })
      ];
      const cards = buildEnvironmentCards(environments, [], []);

      expect(cards).toHaveLength(2);
      expect(cards[0].name).toBe("Env 1");
      expect(cards[1].name).toBe("Env 2");
    });

    it("should set health to caution when no runs match", () => {
      const environments = [createMockEnvironment({ id: "env-1" })];
      const cards = buildEnvironmentCards(environments, [], []);

      expect(cards[0].health).toBe("caution");
      expect(cards[0].observedUsage).toBe("Saved environment profile with no recorded runs yet.");
    });

    it("should set health to observed and count usage when runs match", () => {
      const environments = [createMockEnvironment({ id: "env-1", targetUrl: "https://test.com" })];
      const runs = [
        createMockRun({ plan: { ...createMockRun().plan, environmentLibraryId: "env-1" } }),
        createMockRun({ plan: { ...createMockRun().plan, environment: "production", targetUrl: "https://test.com" } })
      ];
      const cards = buildEnvironmentCards(environments, runs, []);

      expect(cards[0].health).toBe("observed");
      expect(cards[0].observedUsage).toContain("2 recorded runs");
    });

    it("should sort environments by name", () => {
      const environments = [
        createMockEnvironment({ id: "env-b", name: "Bravo" }),
        createMockEnvironment({ id: "env-a", name: "Alpha" })
      ];
      const cards = buildEnvironmentCards(environments, [], []);

      expect(cards[0].name).toBe("Alpha");
      expect(cards[1].name).toBe("Bravo");
    });
  });
});
