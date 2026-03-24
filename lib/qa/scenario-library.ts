import type {
  Scenario,
  ScenarioLibrary,
  ScenarioLibraryChangeSummary,
  ScenarioLibraryComparison,
  ScenarioLibraryVersion
} from "@/lib/types";

function normalizeScenarioText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildScenarioFingerprint(scenario: Scenario): string {
  return JSON.stringify({
    priority: scenario.priority,
    type: scenario.type,
    steps: scenario.steps.map(normalizeScenarioText),
    expectedResult: normalizeScenarioText(scenario.expectedResult),
    riskRationale: normalizeScenarioText(scenario.riskRationale),
    approvedForAutomation: scenario.approvedForAutomation
  });
}

function createScenarioMap(scenarios: Scenario[]): Map<string, Scenario> {
  return new Map(scenarios.map((scenario) => [normalizeScenarioText(scenario.title), scenario]));
}

export function summarizeScenarioLibraryChanges(
  previousScenarios: Scenario[],
  nextScenarios: Scenario[]
): ScenarioLibraryChangeSummary {
  const previousMap = createScenarioMap(previousScenarios);
  const nextMap = createScenarioMap(nextScenarios);
  const addedTitles: string[] = [];
  const removedTitles: string[] = [];
  const changedTitles: string[] = [];
  let reused = 0;

  for (const [key, scenario] of nextMap.entries()) {
    const previousScenario = previousMap.get(key);

    if (!previousScenario) {
      addedTitles.push(scenario.title);
      continue;
    }

    if (buildScenarioFingerprint(previousScenario) === buildScenarioFingerprint(scenario)) {
      reused += 1;
      continue;
    }

    changedTitles.push(scenario.title);
  }

  for (const [key, scenario] of previousMap.entries()) {
    if (!nextMap.has(key)) {
      removedTitles.push(scenario.title);
    }
  }

  return {
    reused,
    added: addedTitles.length,
    removed: removedTitles.length,
    changed: changedTitles.length,
    addedTitles,
    removedTitles,
    changedTitles
  };
}

export function formatScenarioLibraryChangeSummary(changeSummary: ScenarioLibraryChangeSummary): string {
  if (!changeSummary.added && !changeSummary.removed && !changeSummary.changed) {
    return `${changeSummary.reused} scenario(s) reused with no baseline changes.`;
  }

  return [
    `${changeSummary.reused} reused`,
    `${changeSummary.added} added`,
    `${changeSummary.changed} changed`,
    `${changeSummary.removed} removed`
  ].join(" • ");
}

export function createInitialScenarioLibraryVersion(
  scenarios: Scenario[],
  createdAt: string,
  sourceRunId?: string
): ScenarioLibraryVersion {
  const changeSummary: ScenarioLibraryChangeSummary = {
    reused: 0,
    added: scenarios.length,
    removed: 0,
    changed: 0,
    addedTitles: scenarios.map((scenario) => scenario.title),
    removedTitles: [],
    changedTitles: []
  };

  return {
    version: 1,
    createdAt,
    sourceRunId,
    scenarioCount: scenarios.length,
    summary: `Initial library snapshot with ${scenarios.length} scenario(s).`,
    changeSummary
  };
}

export function createScenarioLibraryVersion(
  version: number,
  previousScenarios: Scenario[],
  nextScenarios: Scenario[],
  createdAt: string,
  sourceRunId?: string
): ScenarioLibraryVersion {
  const changeSummary = summarizeScenarioLibraryChanges(previousScenarios, nextScenarios);

  return {
    version,
    createdAt,
    sourceRunId,
    scenarioCount: nextScenarios.length,
    summary: formatScenarioLibraryChangeSummary(changeSummary),
    changeSummary
  };
}

export function normalizeScenarioLibrary(library: ScenarioLibrary): ScenarioLibrary {
  const versions = library.versions?.length
    ? library.versions
    : [createInitialScenarioLibraryVersion(library.scenarios, library.createdAt, library.sourceRunId)];
  const latestVersion = versions[versions.length - 1];

  return {
    ...library,
    version: library.version ?? latestVersion.version,
    versions
  };
}

export function buildScenarioLibraryComparison(
  library: ScenarioLibrary,
  currentScenarios: Scenario[]
): ScenarioLibraryComparison {
  const changeSummary = summarizeScenarioLibraryChanges(library.scenarios, currentScenarios);

  return {
    libraryId: library.id,
    libraryName: library.name,
    comparedVersion: library.version,
    summary: formatScenarioLibraryChangeSummary(changeSummary),
    changeSummary
  };
}