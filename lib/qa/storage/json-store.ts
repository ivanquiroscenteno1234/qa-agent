import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import type {
  AnalysisInsight,
  Artifact,
  CredentialLibraryInput,
  CredentialLibraryRecord,
  EnvironmentLibraryInput,
  EnvironmentLibraryRecord,
  ExecutionWarning,
  GenerateScenariosResponse,
  RunEvent,
  RunPlan,
  RunRecord,
  RunStatus,
  RunSummary,
  ScenarioLibrary,
  StoredCredentialLibraryRecord
} from "@/lib/types";
import { buildScenarioLibraryComparison } from "@/lib/qa/scenario-library";
import { generateScenariosWithLlm } from "@/lib/qa/scenario-generator";
import { parseStepsWithLlm } from "@/lib/qa/step-parser";
import {
  credentialLibraryStorePath,
  dataDirectory,
  environmentLibraryStorePath,
  runStorePath,
  scenarioLibraryStorePath
} from "@/lib/qa/storage/paths";
import {
  buildEnvironmentLibraryRecord,
  buildStoredCredentialLibraryRecord,
  buildScenarioLibraryRecord,
  buildRunSummary,
  createExecutionWarning,
  createRunEvent,
  findExistingScenarioLibraryForCreate,
  isTerminalRunStatus,
  mergeRunRecord,
  normalizeEnvironmentLibraryRecord,
  normalizeRunRecord,
  normalizeScenarioLibraryRecord,
  normalizeStoredCredentialLibraryRecord,
  sanitizeCredentialLibraryRecord,
  sanitizeRunRecordContent,
  sortCredentialLibraries,
  sortEnvironmentLibraries,
  sortRuns,
  sortScenarioLibraries
} from "@/lib/qa/storage/shared";
import { needsCredentialSecretProtection, protectCredentialSecret } from "@/lib/qa/credential-secret";
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

  try {
    await readFile(environmentLibraryStorePath, "utf8");
  } catch {
    await writeFile(environmentLibraryStorePath, "[]", "utf8");
  }

  try {
    await readFile(credentialLibraryStorePath, "utf8");
  } catch {
    await writeFile(credentialLibraryStorePath, "[]", "utf8");
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

export async function readSeedDataFromJsonStore(): Promise<{
  runs: RunRecord[];
  scenarioLibraries: ScenarioLibrary[];
  environmentLibraries: EnvironmentLibraryRecord[];
  credentialLibraries: StoredCredentialLibraryRecord[];
}> {
  const [runs, scenarioLibraries, environmentLibraries, credentialLibraries] = await Promise.all([
    readJsonFileWithRetry<RunRecord[]>(runStorePath, []),
    readJsonFileWithRetry<ScenarioLibrary[]>(scenarioLibraryStorePath, []),
    readJsonFileWithRetry<EnvironmentLibraryRecord[]>(environmentLibraryStorePath, []),
    readJsonFileWithRetry<StoredCredentialLibraryRecord[]>(credentialLibraryStorePath, [])
  ]);

  return {
    runs: runs.map(normalizeRunRecord),
    scenarioLibraries: scenarioLibraries.map(normalizeScenarioLibraryRecord),
    environmentLibraries: environmentLibraries.map(normalizeEnvironmentLibraryRecord),
    credentialLibraries: credentialLibraries.map(normalizeStoredCredentialLibraryRecord)
  };
}

export function readSeedDataFromJsonStoreSync(): {
  runs: RunRecord[];
  scenarioLibraries: ScenarioLibrary[];
  environmentLibraries: EnvironmentLibraryRecord[];
  credentialLibraries: StoredCredentialLibraryRecord[];
} {
  const runs = existsSync(runStorePath)
    ? (JSON.parse(readFileSync(runStorePath, "utf8")) as RunRecord[])
    : [];
  const scenarioLibraries = existsSync(scenarioLibraryStorePath)
    ? (JSON.parse(readFileSync(scenarioLibraryStorePath, "utf8")) as ScenarioLibrary[])
    : [];
  const environmentLibraries = existsSync(environmentLibraryStorePath)
    ? (JSON.parse(readFileSync(environmentLibraryStorePath, "utf8")) as EnvironmentLibraryRecord[])
    : [];
  const credentialLibraries = existsSync(credentialLibraryStorePath)
    ? (JSON.parse(readFileSync(credentialLibraryStorePath, "utf8")) as StoredCredentialLibraryRecord[])
    : [];

  return {
    runs: runs.map(normalizeRunRecord),
    scenarioLibraries: scenarioLibraries.map(normalizeScenarioLibraryRecord),
    environmentLibraries: environmentLibraries.map(normalizeEnvironmentLibraryRecord),
    credentialLibraries: credentialLibraries.map(normalizeStoredCredentialLibraryRecord)
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

  async function readEnvironmentLibraries(): Promise<EnvironmentLibraryRecord[]> {
    const libraries = await readJsonFileWithRetry<EnvironmentLibraryRecord[]>(environmentLibraryStorePath, []);
    return libraries.map(normalizeEnvironmentLibraryRecord);
  }

  async function writeEnvironmentLibraries(libraries: EnvironmentLibraryRecord[]): Promise<void> {
    await ensureStore();
    await writeJsonAtomic(environmentLibraryStorePath, JSON.stringify(libraries, null, 2));
  }

  async function readStoredCredentialLibraries(): Promise<StoredCredentialLibraryRecord[]> {
    const libraries = await readJsonFileWithRetry<StoredCredentialLibraryRecord[]>(credentialLibraryStorePath, []);
    const normalizedLibraries = libraries.map(normalizeStoredCredentialLibraryRecord);
    const nextLibraries = normalizedLibraries.map((library) => {
      if (library.secretMode !== "stored-secret" || !needsCredentialSecretProtection(library.password)) {
        return library;
      }

      return normalizeStoredCredentialLibraryRecord({
        ...library,
        password: protectCredentialSecret(library.password)
      });
    });

    if (JSON.stringify(nextLibraries) !== JSON.stringify(normalizedLibraries)) {
      await writeStoredCredentialLibraries(nextLibraries);
    }

    return nextLibraries;
  }

  async function writeStoredCredentialLibraries(libraries: StoredCredentialLibraryRecord[]): Promise<void> {
    await ensureStore();
    await writeJsonAtomic(credentialLibraryStorePath, JSON.stringify(libraries, null, 2));
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
    async listEnvironmentLibraries(): Promise<EnvironmentLibraryRecord[]> {
      return sortEnvironmentLibraries(await readEnvironmentLibraries());
    },
    async getEnvironmentLibrary(environmentLibraryId: string): Promise<EnvironmentLibraryRecord | undefined> {
      const libraries = await readEnvironmentLibraries();
      return libraries.find((library) => library.id === environmentLibraryId);
    },
    async upsertEnvironmentLibrary(input: EnvironmentLibraryInput, environmentLibraryId?: string): Promise<EnvironmentLibraryRecord> {
      const libraries = await readEnvironmentLibraries();
      const existing = environmentLibraryId ? libraries.find((library) => library.id === environmentLibraryId) : undefined;
      const nextLibrary = buildEnvironmentLibraryRecord(existing, input, new Date().toISOString());
      const nextLibraries = existing
        ? libraries.map((library) => (library.id === existing.id ? nextLibrary : library))
        : [nextLibrary, ...libraries];
      await writeEnvironmentLibraries(nextLibraries);
      return nextLibrary;
    },
    async listCredentialLibraries(): Promise<CredentialLibraryRecord[]> {
      return sortCredentialLibraries(await readStoredCredentialLibraries()).map(sanitizeCredentialLibraryRecord);
    },
    async getCredentialLibrary(credentialLibraryId: string): Promise<CredentialLibraryRecord | undefined> {
      const libraries = await readStoredCredentialLibraries();
      const credential = libraries.find((library) => library.id === credentialLibraryId);
      return credential ? sanitizeCredentialLibraryRecord(credential) : undefined;
    },
    async getStoredCredentialLibrary(credentialLibraryId: string): Promise<StoredCredentialLibraryRecord | undefined> {
      const libraries = await readStoredCredentialLibraries();
      return libraries.find((library) => library.id === credentialLibraryId);
    },
    async upsertCredentialLibrary(input: CredentialLibraryInput, credentialLibraryId?: string): Promise<CredentialLibraryRecord> {
      const libraries = await readStoredCredentialLibraries();
      const existing = credentialLibraryId ? libraries.find((library) => library.id === credentialLibraryId) : undefined;
      const nextLibrary = buildStoredCredentialLibraryRecord(existing, input, new Date().toISOString());
      const nextLibraries = existing
        ? libraries.map((library) => (library.id === existing.id ? nextLibrary : library))
        : [nextLibrary, ...libraries];
      await writeStoredCredentialLibraries(nextLibraries);
      return sanitizeCredentialLibraryRecord(nextLibrary);
    },
    async touchCredentialLibraryLastUsed(credentialLibraryId: string, usedAt?: string): Promise<CredentialLibraryRecord | undefined> {
      const libraries = await readStoredCredentialLibraries();
      const existing = libraries.find((library) => library.id === credentialLibraryId);

      if (!existing) {
        return undefined;
      }

      const nextLibrary = normalizeStoredCredentialLibraryRecord({
        ...existing,
        lastUsedAt: usedAt ?? new Date().toISOString()
      });
      const nextLibraries = libraries.map((library) => (library.id === existing.id ? nextLibrary : library));
      await writeStoredCredentialLibraries(nextLibraries);
      return sanitizeCredentialLibraryRecord(nextLibrary);
    },
    async listScenarioLibraries(options?: { includeArchived?: boolean }): Promise<ScenarioLibrary[]> {
      const all = sortScenarioLibraries(await readScenarioLibraries());
      return options?.includeArchived ? all : all.filter((l) => (l.status ?? "active") === "active");
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
      libraryName?: string,
      libraryAuthor?: string,
      sourceRunInsights?: AnalysisInsight[]
    ): Promise<ScenarioLibrary> {
      const libraries = await readScenarioLibraries();
      const now = new Date().toISOString();
      const existing = scenarioLibraryId
        ? libraries.find((library) => library.id === scenarioLibraryId)
        : findExistingScenarioLibraryForCreate(libraries, plan, libraryName);
      const nextLibrary = buildScenarioLibraryRecord(existing, plan, generated, now, sourceRunId, libraryName, libraryAuthor, sourceRunInsights);
      const nextLibraries = existing
        ? libraries.map((library) => (library.id === existing.id ? nextLibrary : library))
        : [nextLibrary, ...libraries];
      await writeScenarioLibraries(nextLibraries);
      return nextLibrary;
    },
    async listRuns(): Promise<RunRecord[]> {
      return sortRuns(await readRuns());
    },
    async listRunSummaries(options?: import("@/lib/qa/storage/types").ListRunSummariesOptions): Promise<RunSummary[]> {
      let results = sortRuns(await readRuns());
      if (options?.statusFilter) {
        results = results.filter((run) => run.status === options.statusFilter);
      }
      if (options?.cursor) {
        const idx = results.findIndex((run) => run.id === options.cursor);
        if (idx !== -1) {
          results = results.slice(idx + 1);
        }
      }
      if (options?.limit != null && options.limit > 0) {
        results = results.slice(0, options.limit);
      }
      return results.map(buildRunSummary);
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
      const parsed = await parseStepsWithLlm(
        plan.stepsText,
        `${plan.featureArea} | ${plan.objective} | ${plan.targetUrl}`
      );
      const scenarioLibraries = await readScenarioLibraries();
      const selectedLibrary = plan.scenarioLibraryId
        ? scenarioLibraries.find((library) => library.id === plan.scenarioLibraryId)
        : undefined;
      const generated = selectedLibrary
        ? {
            scenarios: selectedLibrary.scenarios,
            coverageGaps: selectedLibrary.coverageGaps,
            riskSummary: selectedLibrary.riskSummary
          }
        : await generateScenariosWithLlm(plan);
      const now = new Date().toISOString();
      const runRecord: RunRecord = sanitizeRunRecordContent({
        id: createId("run"),
        createdAt: now,
        updatedAt: now,
        plan,
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
    },
    async deleteRun(id: string): Promise<void> {
      const runs = await readRuns();
      await writeRuns(runs.filter((run) => run.id !== id));
    },
    async deleteCredentialLibrary(id: string): Promise<void> {
      const runs = await readRuns();
      const blocked = runs.some((run) => run.plan.credentialLibraryId === id && (run.status === "queued" || run.status === "running"));
      if (blocked) {
        throw new Error("CREDENTIAL_IN_USE");
      }
      const libraries = await readStoredCredentialLibraries();
      await writeStoredCredentialLibraries(libraries.filter((library) => library.id !== id));
    },
    async deleteEnvironmentLibrary(id: string): Promise<void> {
      const runs = await readRuns();
      const blocked = runs.some((run) => run.plan.environmentLibraryId === id && (run.status === "queued" || run.status === "running"));
      if (blocked) {
        throw new Error("ENVIRONMENT_IN_USE");
      }
      const libraries = await readEnvironmentLibraries();
      await writeEnvironmentLibraries(libraries.filter((library) => library.id !== id));
    },
    async duplicateScenarioLibrary(id: string, newName: string): Promise<ScenarioLibrary> {
      const libraries = await readScenarioLibraries();
      const source = libraries.find((l) => l.id === id);
      if (!source) {
        throw new Error("NOT_FOUND");
      }
      const now = new Date().toISOString();
      const newScenarios = source.scenarios.map((s) => ({ ...s, id: createId("scenario") }));
      const newLibrary = normalizeScenarioLibraryRecord({
        ...source,
        id: createId("scenario_library"),
        name: newName,
        status: "active" as const,
        sourceRunId: undefined,
        createdAt: now,
        updatedAt: now,
        version: 1,
        versions: [],
        scenarios: newScenarios
      });
      await writeScenarioLibraries([...libraries, newLibrary]);
      return newLibrary;
    },
    async archiveScenarioLibrary(id: string): Promise<ScenarioLibrary> {
      const libraries = await readScenarioLibraries();
      const idx = libraries.findIndex((l) => l.id === id);
      if (idx === -1) {
        throw new Error("NOT_FOUND");
      }
      const updated = { ...libraries[idx], status: "archived" as const, updatedAt: new Date().toISOString() };
      libraries[idx] = updated;
      await writeScenarioLibraries(libraries);
      return updated;
    },
    async renameScenarioLibrary(id: string, name: string): Promise<ScenarioLibrary> {
      const libraries = await readScenarioLibraries();
      const idx = libraries.findIndex((l) => l.id === id);
      if (idx === -1) {
        throw new Error("NOT_FOUND");
      }
      const updated = { ...libraries[idx], name, updatedAt: new Date().toISOString() };
      libraries[idx] = updated;
      await writeScenarioLibraries(libraries);
      return updated;
    },
    async deleteScenarioLibrary(id: string): Promise<void> {
      const runs = await readRuns();
      const blocked = runs.some((run) => run.plan.scenarioLibraryId === id && (run.status === "queued" || run.status === "running"));
      if (blocked) {
        throw new Error("SCENARIO_LIBRARY_IN_USE");
      }
      const libraries = await readScenarioLibraries();
      await writeScenarioLibraries(libraries.filter((library) => library.id !== id));
    }
  };
}

export { createJsonStoreBackend };