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
  RunRecord,
  RunStatus,
  RunSummary,
  ScenarioLibrary,
  RunPlan,
  StoredCredentialLibraryRecord
} from "@/lib/types";

export type RunRecordPatch = Partial<Omit<RunRecord, "id" | "createdAt">>;

export interface ListRunSummariesOptions {
  limit?: number;
  cursor?: string;
  statusFilter?: RunStatus;
}

export interface QaStoreBackend {
  listEnvironmentLibraries(): Promise<EnvironmentLibraryRecord[]>;
  getEnvironmentLibrary(environmentLibraryId: string): Promise<EnvironmentLibraryRecord | undefined>;
  upsertEnvironmentLibrary(input: EnvironmentLibraryInput, environmentLibraryId?: string): Promise<EnvironmentLibraryRecord>;
  listCredentialLibraries(): Promise<CredentialLibraryRecord[]>;
  getCredentialLibrary(credentialLibraryId: string): Promise<CredentialLibraryRecord | undefined>;
  getStoredCredentialLibrary(credentialLibraryId: string): Promise<StoredCredentialLibraryRecord | undefined>;
  upsertCredentialLibrary(input: CredentialLibraryInput, credentialLibraryId?: string): Promise<CredentialLibraryRecord>;
  touchCredentialLibraryLastUsed(credentialLibraryId: string, usedAt?: string): Promise<CredentialLibraryRecord | undefined>;
  listScenarioLibraries(options?: { includeArchived?: boolean }): Promise<ScenarioLibrary[]>;
  getScenarioLibrary(scenarioLibraryId: string): Promise<ScenarioLibrary | undefined>;
  upsertScenarioLibraryFromRun(
    plan: RunPlan,
    generated: GenerateScenariosResponse,
    sourceRunId?: string,
    scenarioLibraryId?: string,
    libraryName?: string,
    libraryAuthor?: string,
    sourceRunInsights?: AnalysisInsight[]
  ): Promise<ScenarioLibrary>;
  listRunSummaries(options?: ListRunSummariesOptions): Promise<RunSummary[]>;
  listRuns(): Promise<RunRecord[]>;
  getRun(runId: string): Promise<RunRecord | undefined>;
  getRunArtifact(runId: string, artifactId: string): Promise<Artifact | undefined>;
  updateRunState(runId: string, patch: RunRecordPatch): Promise<RunRecord | undefined>;
  appendRunEvent(
    runId: string,
    event: Omit<RunEvent, "id" | "timestamp"> & Partial<Pick<RunEvent, "id" | "timestamp">>
  ): Promise<RunRecord | undefined>;
  appendRunWarning(
    runId: string,
    warning: Omit<ExecutionWarning, "id" | "timestamp"> & Partial<Pick<ExecutionWarning, "id" | "timestamp">>
  ): Promise<RunRecord | undefined>;
  listRunEvents(runId: string): Promise<RunEvent[]>;
  requestRunCancellation(runId: string): Promise<RunRecord | undefined>;
  createRun(plan: RunPlan): Promise<RunRecord>;
  saveRun(record: RunRecord): Promise<RunRecord>;
  renameScenarioLibrary(id: string, name: string): Promise<ScenarioLibrary>;
  archiveScenarioLibrary(id: string): Promise<ScenarioLibrary>;
  duplicateScenarioLibrary(id: string, newName: string): Promise<ScenarioLibrary>;
  deleteRun(id: string): Promise<void>;
  deleteCredentialLibrary(id: string): Promise<void>;
  deleteEnvironmentLibrary(id: string): Promise<void>;
  deleteScenarioLibrary(id: string): Promise<void>;
}