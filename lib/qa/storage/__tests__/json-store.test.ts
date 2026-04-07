import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Paths mock — must be hoisted before importing the store
// ---------------------------------------------------------------------------

let tempDir = "";
let runStorePath = "";
let scenarioLibraryStorePath = "";
let environmentLibraryStorePath = "";
let credentialLibraryStorePath = "";
let dataDirectory = "";

vi.mock("@/lib/qa/storage/paths", () => ({
  get dataDirectory() { return dataDirectory; },
  get runStorePath() { return runStorePath; },
  get scenarioLibraryStorePath() { return scenarioLibraryStorePath; },
  get environmentLibraryStorePath() { return environmentLibraryStorePath; },
  get credentialLibraryStorePath() { return credentialLibraryStorePath; }
}));

// Mock the LLM-dependent scenario-generator and step-parser so they work in
// a pure unit-test environment without network access.
vi.mock("@/lib/qa/scenario-generator", () => ({
  generateScenarios: () => ({
    scenarios: [],
    coverageGaps: [],
    riskSummary: ""
  }),
  generateScenariosWithLlm: async () => ({
    scenarios: [],
    coverageGaps: [],
    riskSummary: ""
  })
}));

vi.mock("@/lib/qa/step-parser", () => ({
  parsePlainTextSteps: () => ({ parsedSteps: [] }),
  parseStepsWithLlm: async () => ({ parsedSteps: [] })
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { createJsonStoreBackend } = await import("@/lib/qa/storage/json-store");

function makePlan() {
  return {
    environment: "staging",
    targetUrl: "https://example.com",
    featureArea: "checkout",
    objective: "test",
    mode: "exploratory-session" as const,
    browser: "chromium",
    device: "desktop",
    headless: true,
    role: "tester",
    credentialReference: "",
    loginEmail: "",
    loginPassword: "",
    buildVersion: "1.0",
    timeboxMinutes: 30,
    riskLevel: "moderate" as const,
    safeMode: false,
    stepsText: "step 1",
    expectedOutcomes: "",
    prerequisites: "",
    cleanupInstructions: "",
    acceptanceCriteria: "",
    riskFocus: []
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  tempDir = path.join(tmpdir(), `qa-json-store-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  dataDirectory = tempDir;
  runStorePath = path.join(tempDir, "qa-runs.json");
  scenarioLibraryStorePath = path.join(tempDir, "qa-scenario-libraries.json");
  environmentLibraryStorePath = path.join(tempDir, "qa-environments.json");
  credentialLibraryStorePath = path.join(tempDir, "qa-credentials.json");
});

afterEach(() => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("json-store — createRun / listRuns / getRun", () => {
  it("creates a run and reads it back", async () => {
    const store = createJsonStoreBackend();
    const plan = makePlan();
    const created = await store.createRun(plan);

    expect(created.id).toBeTruthy();
    expect(created.plan.featureArea).toBe("checkout");
    expect(created.status).toBe("draft");

    const fetched = await store.getRun(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it("lists all created runs", async () => {
    const store = createJsonStoreBackend();
    const a = await store.createRun(makePlan());
    const b = await store.createRun(makePlan());

    const list = await store.listRuns();
    const ids = list.map((r) => r.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
  });

  it("returns undefined for a missing run id", async () => {
    const store = createJsonStoreBackend();
    const result = await store.getRun("run_nonexistent_id");
    expect(result).toBeUndefined();
  });
});

describe("json-store — deleteRun", () => {
  it("deletes a run and does not affect other runs", async () => {
    const store = createJsonStoreBackend();
    const keep = await store.createRun(makePlan());
    const remove = await store.createRun(makePlan());

    await store.deleteRun(remove.id);

    const list = await store.listRuns();
    const ids = list.map((r) => r.id);
    expect(ids).toContain(keep.id);
    expect(ids).not.toContain(remove.id);
  });

  it("does not throw when deleting a non-existent run id", async () => {
    const store = createJsonStoreBackend();
    await expect(store.deleteRun("run_ghost")).resolves.not.toThrow();
  });
});

describe("json-store — resilience", () => {
  it("returns empty list when the store file does not exist yet", async () => {
    const store = createJsonStoreBackend();
    const list = await store.listRuns();
    expect(list).toEqual([]);
  });
});
