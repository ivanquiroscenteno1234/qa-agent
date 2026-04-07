import { describe, expect, it } from "vitest";

import { buildQaInsights } from "@/lib/qa/analysis-engine";
import type { AnalysisInput } from "@/lib/qa/analysis-engine";
import type { CrawlSnapshot } from "@/lib/qa/crawl-model";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<CrawlSnapshot> = {}): CrawlSnapshot {
  return {
    title: "Dashboard",
    url: "https://app.example.com",
    headings: ["Dashboard"],
    buttons: [],
    links: [],
    visitedViews: [],
    ...overrides
  };
}

function makeInput(overrides: Partial<AnalysisInput> = {}): AnalysisInput {
  return {
    stepResults: [],
    artifacts: [],
    warnings: [],
    crawlSnapshot: makeSnapshot(),
    discoverySurface: [],
    defects: [],
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildQaInsights — empty / minimal evidence", () => {
  it("returns empty array when no crawlSnapshot is provided", () => {
    const result = buildQaInsights({
      stepResults: [],
      artifacts: [],
      warnings: []
    });
    expect(result).toEqual([]);
  });

  it("returns empty array when crawlSnapshot is provided but no matching rules fire", () => {
    const result = buildQaInsights(makeInput());
    // No discovery surface, no defects, no views without headings → no insights
    expect(result).toEqual([]);
  });

  it("returns a fallback insight when plan is provided but no other rule fires", () => {
    const result = buildQaInsights(
      makeInput({
        plan: {
          featureArea: "Checkout",
          targetUrl: "https://app.example.com",
          environment: "staging",
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
        }
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("manual-follow-up");
    expect(result[0].evidenceKind).toBe("interpreted");
    expect(result[0].title).toContain("Checkout");
  });
});

describe("buildQaInsights — all insights have required shape", () => {
  it("every returned insight has category, confidence, and evidenceKind", () => {
    const snapshot = makeSnapshot({
      visitedViews: [
        {
          label: "Menú",
          url: "https://app.example.com/menu",
          depth: 1,
          title: "Menú",
          headings: [],        // triggers headingless rule
          buttons: [],
          links: [],
          inputs: []
        }
      ]
    });

    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: snapshot,
        discoverySurface: ["gestión de menú", "artículos del menú", "bundle"]
      })
    );

    expect(result.length).toBeGreaterThan(0);
    for (const insight of result) {
      expect(insight).toHaveProperty("id");
      expect(insight).toHaveProperty("category");
      expect(insight).toHaveProperty("confidence");
      expect(insight).toHaveProperty("evidenceKind");
      expect(["observed", "interpreted"]).toContain(insight.evidenceKind);
    }
  });
});

describe("buildQaInsights — individual rules", () => {
  it("fires the menu-management rule when discoverySurface contains 'menú'", () => {
    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: makeSnapshot(),
        discoverySurface: ["gestión de menú", "artículos del menú"]
      })
    );
    const insight = result.find((i) => i.title.toLowerCase().includes("menu"));
    expect(insight).toBeDefined();
    expect(insight?.evidenceKind).toBe("interpreted");
  });

  it("fires the combos rule when discoverySurface contains 'combos'", () => {
    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: makeSnapshot(),
        discoverySurface: ["combos", "promos"]
      })
    );
    const insight = result.find((i) => i.title.toLowerCase().includes("combo"));
    expect(insight).toBeDefined();
    expect(insight?.evidenceKind).toBe("interpreted");
  });

  it("fires the mixed-language rule when surface has both Spanish and English labels", () => {
    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: makeSnapshot({
          buttons: ["edit", "settings"]
        }),
        discoverySurface: ["menú", "configuración"]
      })
    );
    const insight = result.find((i) => /language|labeling/i.test(i.title));
    expect(insight).toBeDefined();
    expect(insight?.category).toBe("inconsistent-language");
    expect(insight?.evidenceKind).toBe("interpreted");
  });

  it("fires the headingless-views rule when a view has no headings", () => {
    const snapshot = makeSnapshot({
      visitedViews: [
        {
          label: "Dashboard",
          url: "https://app.example.com/dashboard",
          depth: 0,
          title: "Dashboard",
          headings: [],  // no headings
          buttons: [],
          links: [],
          inputs: []
        }
      ]
    });
    const result = buildQaInsights(makeInput({ crawlSnapshot: snapshot }));
    const insight = result.find((i) => /heading/i.test(i.title));
    expect(insight).toBeDefined();
    expect(insight?.category).toBe("missing-label");
    expect(insight?.evidenceKind).toBe("observed");
  });

  it("fires the unlabeled-inputs rule when a matching defect exists", () => {
    const snapshot = makeSnapshot({
      visitedViews: [
        {
          label: "Login",
          url: "https://app.example.com/login",
          depth: 0,
          title: "Login",
          headings: ["Login"],
          buttons: [],
          links: [],
          inputs: [
            { tag: "input", name: "email", type: "email", placeholder: "Enter email", ariaLabel: "" }
          ]
        }
      ]
    });
    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: snapshot,
        defects: [
          {
            id: "defect_001",
            title: "Input relies on placeholder text only",
            severity: "low",
            priority: "P2" as const,
            expectedResult: "",
            actualResult: "",
            stepsToReproduce: [],
            confidence: 0.8
          }
        ]
      })
    );
    const insight = result.find((i) => /label/i.test(i.title));
    expect(insight).toBeDefined();
    expect(insight?.category).toBe("missing-label");
    expect(insight?.evidenceKind).toBe("observed");
  });

  it("fires the indistinct-navigation rule when a matching defect exists", () => {
    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: makeSnapshot(),
        defects: [
          {
            id: "defect_002",
            title: "Navigation target may not expose distinct content",
            severity: "medium",
            priority: "P2" as const,
            expectedResult: "",
            actualResult: "",
            stepsToReproduce: [],
            confidence: 0.75
          }
        ]
      })
    );
    const insight = result.find((i) => /navigation/i.test(i.title));
    expect(insight).toBeDefined();
    expect(insight?.category).toBe("defect-candidate");
    expect(insight?.evidenceKind).toBe("observed");
  });
});

describe("buildQaInsights — evidenceKind distribution", () => {
  it("'observed' insights come from concrete data (defects / crawl data)", () => {
    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: makeSnapshot({
          visitedViews: [
            {
              label: "Empty View",
              url: "https://app.example.com/empty",
              depth: 0,
              title: "",
              headings: [],
              buttons: [],
              links: [],
              inputs: []
            }
          ]
        })
      })
    );
    const observed = result.filter((i) => i.evidenceKind === "observed");
    expect(observed.length).toBeGreaterThan(0);
  });

  it("'interpreted' insights come from heuristic pattern matching", () => {
    const result = buildQaInsights(
      makeInput({
        crawlSnapshot: makeSnapshot(),
        discoverySurface: ["gestión de menú", "artículos del menú"]
      })
    );
    const interpreted = result.filter((i) => i.evidenceKind === "interpreted");
    expect(interpreted.length).toBeGreaterThan(0);
  });
});
