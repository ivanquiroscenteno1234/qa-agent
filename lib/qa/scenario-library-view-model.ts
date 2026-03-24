import type { ScenarioLibrary } from "@/lib/types";

export interface ScenarioLibraryFilters {
  featureArea: string;
  riskProfile: string;
}

function deriveRiskProfile(library: ScenarioLibrary): "high" | "medium" | "low" {
  const text = `${library.riskSummary.join(" ")} ${library.coverageGaps.join(" ")}`.toLowerCase();

  if (text.includes("auth") || text.includes("permission") || text.includes("security")) {
    return "high";
  }

  if (text.includes("validation") || text.includes("state") || text.includes("navigation")) {
    return "medium";
  }

  return "low";
}

export function buildScenarioLibraryCards(libraries: ScenarioLibrary[], filters: ScenarioLibraryFilters): ScenarioLibrary[] {
  return libraries.filter((library) => {
    const featureMatch = filters.featureArea === "all" || library.featureArea === filters.featureArea;
    const riskMatch = filters.riskProfile === "all" || deriveRiskProfile(library) === filters.riskProfile;
    return featureMatch && riskMatch;
  });
}

export function collectScenarioLibraryFeatureAreas(libraries: ScenarioLibrary[]): string[] {
  return [...new Set(libraries.map((library) => library.featureArea).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}