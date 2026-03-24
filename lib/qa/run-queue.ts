import { appendRunEvent, getRun, saveRun, updateRunState } from "@/lib/qa/store";
import { executeRun } from "@/lib/qa/execution-engine";

const activeRunIds = new Set<string>();

function isStartable(status: string): boolean {
  return !["queued", "running", "pass", "fail", "blocked", "cancelled"].includes(status);
}

async function processQueuedRun(runId: string): Promise<void> {
  try {
    const run = await getRun(runId);
    if (!run || run.status === "cancelled") {
      return;
    }

    const startedAt = run.startedAt ?? new Date().toISOString();
    const preparingRun = await updateRunState(runId, {
      status: "running",
      currentPhase: "preparing",
      startedAt,
      currentActivity: "Preparing local browser execution.",
      currentStepNumber: undefined,
      currentScenarioIndex: undefined,
      currentScenarioTitle: undefined,
      summary: "Run is preparing execution.",
      updatedAt: new Date().toISOString()
    });

    await appendRunEvent(runId, {
      phase: "preparing",
      level: "info",
      message: "Run left the queue and is preparing execution.",
      category: "system"
    });

    if (!preparingRun) {
      return;
    }

    const executed = await executeRun(preparingRun);
    const completedAt = executed.completedAt ?? new Date().toISOString();
    await saveRun({ ...executed, completedAt });
    await appendRunEvent(runId, {
      phase: executed.currentPhase,
      level: executed.status === "fail" ? "error" : executed.status === "blocked" ? "warning" : "info",
      message: `Run completed with status ${executed.status}.`,
      category: executed.status === "fail" ? "system" : executed.status === "blocked" ? "unsupported-scenario" : "system"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown queue execution error.";
    await updateRunState(runId, {
      status: "fail",
      currentPhase: "reporting",
      currentActivity: "Queue execution failed before the run could complete.",
      currentStepNumber: undefined,
      currentScenarioIndex: undefined,
      currentScenarioTitle: undefined,
      summary: message,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await appendRunEvent(runId, {
      phase: "reporting",
      level: "error",
      message,
      category: "system"
    });
  } finally {
    activeRunIds.delete(runId);
  }
}

export async function enqueueRun(runId: string) {
  const run = await getRun(runId);

  if (!run) {
    return { ok: false as const, reason: "not-found" };
  }

  if (activeRunIds.has(runId) || run.status === "queued" || run.status === "running") {
    return { ok: false as const, reason: "already-active", run };
  }

  if (!isStartable(run.status)) {
    return { ok: false as const, reason: "not-startable", run };
  }

  const queuedRun = await updateRunState(runId, {
    status: "queued",
    currentPhase: "queued",
    currentActivity: "Waiting in the local execution queue.",
    summary: "Run queued for execution.",
    updatedAt: new Date().toISOString()
  });

  await appendRunEvent(runId, {
    phase: "queued",
    level: "info",
    message: "Run queued for execution.",
    category: "system"
  });

  activeRunIds.add(runId);
  void processQueuedRun(runId);

  return { ok: true as const, run: queuedRun };
}

export function isRunActive(runId: string): boolean {
  return activeRunIds.has(runId);
}