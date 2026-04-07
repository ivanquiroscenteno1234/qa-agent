import type { ScenarioLibrary } from "@/lib/types";

export interface ScenarioLibraryFilters {
  featureArea: string;
  riskProfile: string;
  author: string;
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
    const authorMatch = filters.author === "all" || !filters.author || (library.author ?? "") === filters.author;
    return featureMatch && riskMatch && authorMatch;
  });
}

export function collectScenarioLibraryFeatureAreas(libraries: ScenarioLibrary[]): string[] {
  return [...new Set(libraries.map((library) => library.featureArea).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function collectScenarioLibraryAuthors(libraries: ScenarioLibrary[]): string[] {
  return [...new Set(libraries.map((library) => library.author ?? "").filter(Boolean))].sort((left, right) => left.localeCompare(right));
}