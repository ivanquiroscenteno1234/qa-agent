import { describe, it, expect } from "vitest";
import {
  collectScenarioLibraryAuthors,
  collectScenarioLibraryFeatureAreas,
} from "../scenario-library-view-model";
import type { ScenarioLibrary } from "@/lib/types";

function createMockLibrary(overrides: Partial<ScenarioLibrary> = {}): ScenarioLibrary {
  return {
    id: "test-id",
    name: "Test Library",
    status: "active",
    featureArea: "auth",
    environment: "production",
    targetUrl: "https://example.com",
    role: "admin",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    version: 1,
    versions: [],
    scenarios: [],
    riskSummary: [],
    coverageGaps: [],
    ...overrides,
  } as ScenarioLibrary;
}

describe("Scenario Library View Model", () => {
  describe("collectScenarioLibraryAuthors", () => {
    it("should return a sorted list of unique authors", () => {
      const libraries = [
        createMockLibrary({ author: "Charlie" }),
        createMockLibrary({ author: "Alice" }),
        createMockLibrary({ author: "Bob" }),
        createMockLibrary({ author: "Alice" }), // duplicate
      ];

      const result = collectScenarioLibraryAuthors(libraries);
      expect(result).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should filter out undefined authors", () => {
      const libraries = [
        createMockLibrary({ author: "Alice" }),
        createMockLibrary({ author: undefined }),
      ];

      const result = collectScenarioLibraryAuthors(libraries);
      expect(result).toEqual(["Alice"]);
    });

    it("should filter out empty string authors", () => {
      const libraries = [
        createMockLibrary({ author: "Alice" }),
        createMockLibrary({ author: "" }),
      ];

      const result = collectScenarioLibraryAuthors(libraries);
      expect(result).toEqual(["Alice"]);
    });

    it("should filter out whitespace-only authors", () => {
      const libraries = [
        createMockLibrary({ author: "Alice" }),
        createMockLibrary({ author: "   " }),
      ];

      const result = collectScenarioLibraryAuthors(libraries);
      expect(result).toEqual(["Alice"]);
    });

    it("should trim and deduplicate authors with leading or trailing whitespaces", () => {
      const libraries = [
        createMockLibrary({ author: " Alice " }),
        createMockLibrary({ author: "Alice" }),
        createMockLibrary({ author: "Bob  " }),
        createMockLibrary({ author: "  Bob" }),
      ];

      const result = collectScenarioLibraryAuthors(libraries);
      expect(result).toEqual(["Alice", "Bob"]);
    });

    it("should return an empty array if all authors are falsy or whitespace-only", () => {
      const libraries = [
        createMockLibrary({ author: undefined }),
        createMockLibrary({ author: "" }),
        createMockLibrary({ author: "   " }),
      ];

      const result = collectScenarioLibraryAuthors(libraries);
      expect(result).toEqual([]);
    });

    it("should handle an empty list of libraries", () => {
      expect(collectScenarioLibraryAuthors([])).toEqual([]);
    });
  });

  describe("collectScenarioLibraryFeatureAreas", () => {
    it("should return a sorted list of unique feature areas", () => {
      const libraries = [
        createMockLibrary({ featureArea: "Settings" }),
        createMockLibrary({ featureArea: "Auth" }),
        createMockLibrary({ featureArea: "Dashboard" }),
        createMockLibrary({ featureArea: "Auth" }), // duplicate
      ];

      const result = collectScenarioLibraryFeatureAreas(libraries);
      expect(result).toEqual(["Auth", "Dashboard", "Settings"]);
    });

    it("should filter out empty string feature areas", () => {
      const libraries = [
        createMockLibrary({ featureArea: "Auth" }),
        createMockLibrary({ featureArea: "" }),
      ];

      const result = collectScenarioLibraryFeatureAreas(libraries);
      expect(result).toEqual(["Auth"]);
    });

    it("should filter out whitespace-only feature areas", () => {
      const libraries = [
        createMockLibrary({ featureArea: "Auth" }),
        createMockLibrary({ featureArea: "   " }),
      ];

      const result = collectScenarioLibraryFeatureAreas(libraries);
      expect(result).toEqual(["Auth"]);
    });

    it("should trim and deduplicate feature areas with leading or trailing whitespaces", () => {
      const libraries = [
        createMockLibrary({ featureArea: " Auth " }),
        createMockLibrary({ featureArea: "Auth" }),
        createMockLibrary({ featureArea: "Settings  " }),
      ];

      const result = collectScenarioLibraryFeatureAreas(libraries);
      expect(result).toEqual(["Auth", "Settings"]);
    });

    it("should handle an empty list of libraries", () => {
      expect(collectScenarioLibraryFeatureAreas([])).toEqual([]);
    });
  });
});
