import { appendRunEvent, appendRunWarning, getRun, updateRunState } from "@/lib/qa/store";
import type { FailureCategory, RunRecord } from "@/lib/types";

export class RunCancelledError extends Error {
  constructor() {
    super("Run cancelled by operator.");
    this.name = "RunCancelledError";
  }
}

export function isCancellationError(error: unknown): error is RunCancelledError {
  return error instanceof RunCancelledError;
}

export async function ensureRunNotCancelled(runId: string): Promise<void> {
  const run = await getRun(runId);

  if (run?.cancelRequestedAt || run?.status === "cancelled") {
    throw new RunCancelledError();
  }
}

export async function emitEvent(
  runId: string,
  phase: RunRecord["currentPhase"],
  message: string,
  options?: { level?: "info" | "warning" | "error"; category?: FailureCategory; stepNumber?: number; scenarioTitle?: string }
): Promise<void> {
  await appendRunEvent(runId, {
    phase,
    level: options?.level ?? "info",
    message,
    category: options?.category,
    stepNumber: options?.stepNumber,
    scenarioTitle: options?.scenarioTitle
  });
}

export async function emitWarning(
  runId: string,
  phase: RunRecord["currentPhase"],
  message: string,
  category: FailureCategory,
  options?: { stepNumber?: number; scenarioTitle?: string; recoverable?: boolean }
): Promise<void> {
  await appendRunWarning(runId, {
    phase,
    message,
    category,
    stepNumber: options?.stepNumber,
    scenarioTitle: options?.scenarioTitle,
    recoverable: options?.recoverable ?? true
  });
}

export async function persistCheckpoint(
  record: RunRecord,
  patch: Partial<RunRecord>,
  event?: { message: string; level?: "info" | "warning" | "error"; category?: FailureCategory; stepNumber?: number; scenarioTitle?: string }
): Promise<void> {
  await updateRunState(record.id, {
    ...patch,
    updatedAt: new Date().toISOString()
  });

  if (event) {
    await emitEvent(record.id, (patch.currentPhase as RunRecord["currentPhase"]) ?? record.currentPhase, event.message, {
      level: event.level,
      category: event.category,
      stepNumber: event.stepNumber,
      scenarioTitle: event.scenarioTitle
    });
  }
}