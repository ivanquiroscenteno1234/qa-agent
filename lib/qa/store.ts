import type {
  Artifact,
  ExecutionWarning,
  GenerateScenariosResponse,
  RunEvent,
  RunPlan,
  RunRecord,
  RunSummary,
  ScenarioLibrary
} from "@/lib/types";
import { getQaStoreBackend } from "@/lib/qa/storage/backend";
import type { RunRecordPatch } from "@/lib/qa/storage/types";

export async function listScenarioLibraries(): Promise<ScenarioLibrary[]> {
  return getQaStoreBackend().listScenarioLibraries();
}

export async function getScenarioLibrary(scenarioLibraryId: string): Promise<ScenarioLibrary | undefined> {
  return getQaStoreBackend().getScenarioLibrary(scenarioLibraryId);
}

export async function upsertScenarioLibraryFromRun(
  plan: RunPlan,
  generated: GenerateScenariosResponse,
  sourceRunId?: string,
  scenarioLibraryId?: string,
  libraryName?: string
): Promise<ScenarioLibrary> {
  return getQaStoreBackend().upsertScenarioLibraryFromRun(plan, generated, sourceRunId, scenarioLibraryId, libraryName);
}

export async function listRuns(): Promise<RunRecord[]> {
  return getQaStoreBackend().listRuns();
}

export async function listRunSummaries(): Promise<RunSummary[]> {
  return getQaStoreBackend().listRunSummaries();
}

export async function getRun(runId: string): Promise<RunRecord | undefined> {
  return getQaStoreBackend().getRun(runId);
}

export async function getRunArtifact(runId: string, artifactId: string): Promise<Artifact | undefined> {
  return getQaStoreBackend().getRunArtifact(runId, artifactId);
}

export async function updateRunState(runId: string, patch: RunRecordPatch): Promise<RunRecord | undefined> {
  return getQaStoreBackend().updateRunState(runId, patch);
}

export async function appendRunEvent(
  runId: string,
  event: Omit<RunEvent, "id" | "timestamp"> & Partial<Pick<RunEvent, "id" | "timestamp">>
): Promise<RunRecord | undefined> {
  return getQaStoreBackend().appendRunEvent(runId, event);
}

export async function appendRunWarning(
  runId: string,
  warning: Omit<ExecutionWarning, "id" | "timestamp"> & Partial<Pick<ExecutionWarning, "id" | "timestamp">>
): Promise<RunRecord | undefined> {
  return getQaStoreBackend().appendRunWarning(runId, warning);
}

export async function listRunEvents(runId: string): Promise<RunEvent[]> {
  return getQaStoreBackend().listRunEvents(runId);
}

export async function requestRunCancellation(runId: string): Promise<RunRecord | undefined> {
  return getQaStoreBackend().requestRunCancellation(runId);
}

export async function createRun(plan: RunPlan): Promise<RunRecord> {
  return getQaStoreBackend().createRun(plan);
}

export async function saveRun(record: RunRecord): Promise<RunRecord> {
  return getQaStoreBackend().saveRun(record);
}