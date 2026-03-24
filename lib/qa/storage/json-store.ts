import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import type {
  Artifact,
  ExecutionWarning,
  GenerateScenariosResponse,
  RunEvent,
  RunPlan,
  RunRecord,
  RunStatus,
  RunSummary,
  ScenarioLibrary
} from "@/lib/types";
import { buildScenarioLibraryComparison } from "@/lib/qa/scenario-library";
import { generateScenarios } from "@/lib/qa/scenario-generator";
import { parsePlainTextSteps } from "@/lib/qa/step-parser";
import { dataDirectory, runStorePath, scenarioLibraryStorePath } from "@/lib/qa/storage/paths";
import {
  buildScenarioLibraryRecord,
  buildRunSummary,
  createExecutionWarning,
  createRunEvent,
  findExistingScenarioLibraryForCreate,
  findMatchingScenarioLibrary,
  isTerminalRunStatus,
  mergeRunRecord,
  normalizeRunRecord,
  normalizeScenarioLibraryRecord,
  sanitizeRunRecordContent,
  sortRuns,
  sortScenarioLibraries
} from "@/lib/qa/storage/shared";
import type { QaStoreBackend, RunRecordPatch } from "@/lib/qa/storage/types";
import { createId } from "@/lib/qa/utils";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureStore(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(runStorePath, "utf8");
  } catch {
    await writeFile(runStorePath, "[]", "utf8");
  }

  try {
    await readFile(scenarioLibraryStorePath, "utf8");
  } catch {
    await writeFile(scenarioLibraryStorePath, "[]", "utf8");
  }
}

async function readJsonFileWithRetry<T>(filePath: string, fallback: T): Promise<T> {
  await ensureStore();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const content = await readFile(filePath, "utf8");
      return JSON.parse(content) as T;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      const retryable = error instanceof SyntaxError || code === "ENOENT";

      if (!retryable) {
        throw error;
      }

      if (code === "ENOENT") {
        return fallback;
      }

      if (attempt === 2) {
        throw error;
      }

      await delay(25 * (attempt + 1));
    }
  }

  return fallback;
}

async function writeJsonAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, content, "utf8");

  try {
    await rename(tempPath, filePath);
  } catch {
    await writeFile(filePath, content, "utf8");
  }
}

export async function readSeedDataFromJsonStore(): Promise<{ runs: RunRecord[]; scenarioLibraries: ScenarioLibrary[] }> {
  const [runs, scenarioLibraries] = await Promise.all([
    readJsonFileWithRetry<RunRecord[]>(runStorePath, []),
    readJsonFileWithRetry<ScenarioLibrary[]>(scenarioLibraryStorePath, [])
  ]);

  return {
    runs: runs.map(normalizeRunRecord),
    scenarioLibraries: scenarioLibraries.map(normalizeScenarioLibraryRecord)
  };
}

export function readSeedDataFromJsonStoreSync(): { runs: RunRecord[]; scenarioLibraries: ScenarioLibrary[] } {
  const runs = existsSync(runStorePath)
    ? (JSON.parse(readFileSync(runStorePath, "utf8")) as RunRecord[])
    : [];
  const scenarioLibraries = existsSync(scenarioLibraryStorePath)
    ? (JSON.parse(readFileSync(scenarioLibraryStorePath, "utf8")) as ScenarioLibrary[])
    : [];

  return {
    runs: runs.map(normalizeRunRecord),
    scenarioLibraries: scenarioLibraries.map(normalizeScenarioLibraryRecord)
  };
}

function createJsonStoreBackend(): QaStoreBackend {
  async function readRuns(): Promise<RunRecord[]> {
    const content = await readJsonFileWithRetry<RunRecord[]>(runStorePath, []);
    return content.map(normalizeRunRecord);
  }

  async function writeRuns(runs: RunRecord[]): Promise<void> {
    await ensureStore();
    await writeJsonAtomic(runStorePath, JSON.stringify(runs, null, 2));
  }

  async function readScenarioLibraries(): Promise<ScenarioLibrary[]> {
    const libraries = await readJsonFileWithRetry<ScenarioLibrary[]>(scenarioLibraryStorePath, []);
    return libraries.map(normalizeScenarioLibraryRecord);
  }

  async function writeScenarioLibraries(libraries: ScenarioLibrary[]): Promise<void> {
    await ensureStore();
    await writeJsonAtomic(scenarioLibraryStorePath, JSON.stringify(libraries, null, 2));
  }

  async function mutateRun(runId: string, mutate: (run: RunRecord) => RunRecord): Promise<RunRecord | undefined> {
    const runs = await readRuns();
    const index = runs.findIndex((run) => run.id === runId);

    if (index === -1) {
      return undefined;
    }

    const nextRun = sanitizeRunRecordContent(normalizeRunRecord(mutate(runs[index])));
    const nextRuns = [...runs];
    nextRuns[index] = nextRun;
    await writeRuns(nextRuns);
    return nextRun;
  }

  return {
    async listScenarioLibraries(): Promise<ScenarioLibrary[]> {
      return sortScenarioLibraries(await readScenarioLibraries());
    },
    async getScenarioLibrary(scenarioLibraryId: string): Promise<ScenarioLibrary | undefined> {
      const libraries = await readScenarioLibraries();
      return libraries.find((library) => library.id === scenarioLibraryId);
    },
    async upsertScenarioLibraryFromRun(
      plan: RunPlan,
      generated: GenerateScenariosResponse,
      sourceRunId?: string,
      scenarioLibraryId?: string,
      libraryName?: string
    ): Promise<ScenarioLibrary> {
      const libraries = await readScenarioLibraries();
      const now = new Date().toISOString();
      const existing = scenarioLibraryId
        ? libraries.find((library) => library.id === scenarioLibraryId)
        : findExistingScenarioLibraryForCreate(libraries, plan, libraryName);
      const nextLibrary = buildScenarioLibraryRecord(existing, plan, generated, now, sourceRunId, libraryName);
      const nextLibraries = existing
        ? libraries.map((library) => (library.id === existing.id ? nextLibrary : library))
        : [nextLibrary, ...libraries];
      await writeScenarioLibraries(nextLibraries);
      return nextLibrary;
    },
    async listRuns(): Promise<RunRecord[]> {
      return sortRuns(await readRuns());
    },
    async listRunSummaries(): Promise<RunSummary[]> {
      return sortRuns(await readRuns()).map(buildRunSummary);
    },
    async getRun(runId: string): Promise<RunRecord | undefined> {
      const runs = await readRuns();
      return runs.find((run) => run.id === runId);
    },
    async getRunArtifact(runId: string, artifactId: string): Promise<Artifact | undefined> {
      const run = await this.getRun(runId);
      return run?.artifacts.find((artifact) => artifact.id === artifactId);
    },
    async updateRunState(runId: string, patch: RunRecordPatch): Promise<RunRecord | undefined> {
      return mutateRun(runId, (run) => mergeRunRecord(run, patch));
    },
    async appendRunEvent(
      runId: string,
      event: Omit<RunEvent, "id" | "timestamp"> & Partial<Pick<RunEvent, "id" | "timestamp">>
    ): Promise<RunRecord | undefined> {
      return mutateRun(runId, (run) => ({
        ...run,
        updatedAt: new Date().toISOString(),
        events: [...run.events, createRunEvent(event)]
      }));
    },
    async appendRunWarning(
      runId: string,
      warning: Omit<ExecutionWarning, "id" | "timestamp"> & Partial<Pick<ExecutionWarning, "id" | "timestamp">>
    ): Promise<RunRecord | undefined> {
      const nextWarning = createExecutionWarning(warning);
      return mutateRun(runId, (run) => ({
        ...run,
        updatedAt: new Date().toISOString(),
        warnings: [...run.warnings, nextWarning],
        events: [
          ...run.events,
          createRunEvent({
            phase: nextWarning.phase,
            level: "warning",
            message: nextWarning.message,
            category: nextWarning.category,
            stepNumber: nextWarning.stepNumber,
            scenarioTitle: nextWarning.scenarioTitle,
            timestamp: nextWarning.timestamp
          })
        ]
      }));
    },
    async listRunEvents(runId: string): Promise<RunEvent[]> {
      const run = await this.getRun(runId);
      return [...(run?.events ?? [])].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    },
    async requestRunCancellation(runId: string): Promise<RunRecord | undefined> {
      const now = new Date().toISOString();
      return mutateRun(runId, (run) => {
        if (isTerminalRunStatus(run.status)) {
          return run;
        }
        if (run.status === "draft" || run.status === "queued") {
          const cancelledStatus: RunStatus = "cancelled";
          return {
            ...run,
            status: cancelledStatus,
            currentPhase: "cancelled",
            summary: "Run was cancelled before execution started.",
            cancelRequestedAt: now,
            completedAt: now,
            updatedAt: now,
            events: [
              ...run.events,
              createRunEvent({
                phase: "cancelled",
                level: "info",
                message: "Run was cancelled before execution started.",
                category: "cancelled",
                timestamp: now
              })
            ]
          };
        }
        if (run.cancelRequestedAt) {
          return run;
        }
        return {
          ...run,
          cancelRequestedAt: now,
          updatedAt: now,
          events: [
            ...run.events,
            createRunEvent({
              phase: run.currentPhase,
              level: "warning",
              message: "Cancellation requested. The run will stop at the next safe boundary.",
              category: "cancelled",
              timestamp: now
            })
          ]
        };
      });
    },
    async createRun(plan: RunPlan): Promise<RunRecord> {
      const parsed = parsePlainTextSteps(plan.stepsText);
      const scenarioLibraries = await readScenarioLibraries();
      const selectedLibrary = plan.scenarioLibraryId
        ? scenarioLibraries.find((library) => library.id === plan.scenarioLibraryId)
        : findMatchingScenarioLibrary(scenarioLibraries, plan);
      const generated = selectedLibrary
        ? {
            scenarios: selectedLibrary.scenarios,
            coverageGaps: selectedLibrary.coverageGaps,
            riskSummary: selectedLibrary.riskSummary
          }
        : generateScenarios(plan);
      const now = new Date().toISOString();
      const scenarioLibrary = selectedLibrary ?? (generated.scenarios.length ? await this.upsertScenarioLibraryFromRun(plan, generated) : undefined);
      const planWithLibrary = scenarioLibrary ? { ...plan, scenarioLibraryId: scenarioLibrary.id } : plan;
      const runRecord: RunRecord = sanitizeRunRecordContent({
        id: createId("run"),
        createdAt: now,
        updatedAt: now,
        plan: planWithLibrary,
        parsedSteps: parsed.parsedSteps,
        generatedScenarios: generated.scenarios,
        status: "draft",
        currentPhase: "intake",
        summary: "Run created and ready for execution.",
        riskSummary: generated.riskSummary,
        coverageGaps: generated.coverageGaps,
        stepResults: [],
        artifacts: [],
        defects: [],
        analysisInsights: [],
        scenarioLibraryComparison: selectedLibrary ? buildScenarioLibraryComparison(selectedLibrary, generated.scenarios) : undefined,
        events: [
          createRunEvent({
            phase: "intake",
            level: "info",
            message: "Run created and ready for execution.",
            category: "system",
            timestamp: now
          })
        ],
        warnings: []
      });
      const runs = await readRuns();
      runs.push(runRecord);
      await writeRuns(runs);
      return runRecord;
    },
    async saveRun(record: RunRecord): Promise<RunRecord> {
      const scenarioLibraries = record.plan.scenarioLibraryId ? await readScenarioLibraries() : [];
      const existingLibrary = record.plan.scenarioLibraryId
        ? scenarioLibraries.find((library) => library.id === record.plan.scenarioLibraryId)
        : undefined;
      const nextRecord = existingLibrary
        ? { ...record, scenarioLibraryComparison: buildScenarioLibraryComparison(existingLibrary, record.generatedScenarios) }
        : record;
      const runs = await readRuns();
      const nextRuns = runs.map((existing) =>
        existing.id === nextRecord.id ? sanitizeRunRecordContent(mergeRunRecord(existing, nextRecord)) : existing
      );
      await writeRuns(nextRuns);
      const savedRecord = nextRuns.find((existing) => existing.id === nextRecord.id) ?? sanitizeRunRecordContent(normalizeRunRecord(nextRecord));
      if (savedRecord.generatedScenarios.length && savedRecord.plan.scenarioLibraryId && savedRecord.plan.mode !== "regression-run") {
        await this.upsertScenarioLibraryFromRun(
          savedRecord.plan,
          {
            scenarios: savedRecord.generatedScenarios,
            coverageGaps: savedRecord.coverageGaps,
            riskSummary: savedRecord.riskSummary
          },
          savedRecord.id,
          savedRecord.plan.scenarioLibraryId
        );
      }
      return savedRecord;
    }
  };
}

export { createJsonStoreBackend };