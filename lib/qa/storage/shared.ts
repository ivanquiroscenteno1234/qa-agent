import type {
  AnalysisInsight,
  CredentialLibraryInput,
  CredentialLibraryRecord,
  EnvironmentLibraryInput,
  EnvironmentLibraryRecord,
  RunSummary,
  ExecutionWarning,
  GenerateScenariosResponse,
  RunEvent,
  RunPlan,
  RunRecord,
  RunStatus,
  ScenarioLibrary,
  StoredCredentialLibraryRecord
} from "@/lib/types";
import {
  createInitialScenarioLibraryVersion,
  createScenarioLibraryVersion,
  normalizeScenarioLibrary,
  summarizeScenarioLibraryChanges
} from "@/lib/qa/scenario-library";
import { protectCredentialSecret } from "@/lib/qa/credential-secret";
import type { RunRecordPatch } from "@/lib/qa/storage/types";
import { createId } from "@/lib/qa/utils";

export function createScenarioLibraryName(plan: RunPlan): string {
  return `${plan.featureArea || "Scenario Library"} (${plan.environment})`;
}

export function normalizeRunRecord(record: RunRecord): RunRecord {
  return {
    ...record,
    plan: {
      ...record.plan,
      environmentLibraryId: record.plan.environmentLibraryId,
      credentialLibraryId: record.plan.credentialLibraryId,
      credentialReference: record.plan.credentialReference ?? "",
      loginEmail: record.plan.loginEmail ?? "",
      loginPassword: record.plan.loginPassword ?? "",
      scenarioLibraryId: record.plan.scenarioLibraryId
    },
    currentPhase: record.currentPhase ?? "intake",
    currentActivity: record.currentActivity,
    currentStepNumber: record.currentStepNumber,
    currentScenarioIndex: record.currentScenarioIndex,
    currentScenarioTitle: record.currentScenarioTitle,
    events: record.events ?? [],
    warnings: record.warnings ?? [],
    stepResults: record.stepResults ?? [],
    artifacts: record.artifacts ?? [],
    defects: record.defects ?? [],
    analysisInsights: (record.analysisInsights ?? []).map((insight) => ({
      ...insight,
      evidence: insight.evidence ?? []
    })),
    scenarioLibraryComparison: record.scenarioLibraryComparison
  };
}

export function buildRunSummary(record: RunRecord): RunSummary {
  const normalized = normalizeRunRecord(record);

  return {
    id: normalized.id,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    startedAt: normalized.startedAt,
    completedAt: normalized.completedAt,
    cancelRequestedAt: normalized.cancelRequestedAt,
    currentActivity: normalized.currentActivity,
    currentStepNumber: normalized.currentStepNumber,
    currentScenarioIndex: normalized.currentScenarioIndex,
    currentScenarioTitle: normalized.currentScenarioTitle,
    plan: {
      environment: normalized.plan.environment,
      targetUrl: normalized.plan.targetUrl,
      featureArea: normalized.plan.featureArea,
      mode: normalized.plan.mode,
      browser: normalized.plan.browser,
      role: normalized.plan.role,
      scenarioLibraryId: normalized.plan.scenarioLibraryId
    },
    status: normalized.status,
    currentPhase: normalized.currentPhase,
    summary: normalized.summary,
    counts: {
      parsedSteps: normalized.parsedSteps.length,
      generatedScenarios: normalized.generatedScenarios.length,
      stepResults: normalized.stepResults.length,
      artifacts: normalized.artifacts.length,
      defects: normalized.defects.length
    }
  };
}

export function normalizeScenarioLibraryRecord(record: ScenarioLibrary): ScenarioLibrary {
  return normalizeScenarioLibrary(record);
}

export function normalizeEnvironmentLibraryRecord(record: EnvironmentLibraryRecord): EnvironmentLibraryRecord {
  return {
    ...record,
    defaultCredentialId: record.defaultCredentialId?.trim() || undefined,
    notes: record.notes ?? ""
  };
}

export function normalizeStoredCredentialLibraryRecord(record: StoredCredentialLibraryRecord): StoredCredentialLibraryRecord {
  return {
    ...record,
    reference: record.reference?.trim() || undefined,
    notes: record.notes ?? "",
    password: record.password?.trim() || undefined,
    lastUsedAt: record.lastUsedAt ?? undefined
  };
}

export function sanitizeCredentialLibraryRecord(record: StoredCredentialLibraryRecord): CredentialLibraryRecord {
  const normalized = normalizeStoredCredentialLibraryRecord(record);

  return {
    id: normalized.id,
    label: normalized.label,
    username: normalized.username,
    secretMode: normalized.secretMode,
    reference: normalized.reference,
    hasStoredSecret: Boolean(normalized.password),
    status: normalized.status,
    notes: normalized.notes,
    lastUsedAt: normalized.lastUsedAt,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt
  };
}

export function buildEnvironmentLibraryRecord(
  existing: EnvironmentLibraryRecord | undefined,
  input: EnvironmentLibraryInput,
  now: string
): EnvironmentLibraryRecord {
  return normalizeEnvironmentLibraryRecord({
    id: existing?.id ?? createId("environment_library"),
    name: input.name.trim(),
    targetUrl: input.targetUrl.trim(),
    environment: input.environment.trim(),
    role: input.role.trim(),
    browser: input.browser.trim(),
    device: input.device.trim(),
    safeMode: input.safeMode,
    riskLevel: input.riskLevel,
    defaultCredentialId: input.defaultCredentialId?.trim() || undefined,
    notes: input.notes.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  });
}

export function buildStoredCredentialLibraryRecord(
  existing: StoredCredentialLibraryRecord | undefined,
  input: CredentialLibraryInput,
  now: string
): StoredCredentialLibraryRecord {
  const nextPassword =
    input.secretMode === "stored-secret"
      ? protectCredentialSecret(input.password?.trim() || existing?.password?.trim() || undefined)
      : undefined;

  return normalizeStoredCredentialLibraryRecord({
    id: existing?.id ?? createId("credential_library"),
    label: input.label.trim(),
    username: input.username.trim(),
    password: nextPassword,
    secretMode: input.secretMode,
    reference: input.reference?.trim() || undefined,
    status: input.status,
    notes: input.notes.trim(),
    lastUsedAt: existing?.lastUsedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  });
}

export function hasScenarioLibraryChanges(existing: ScenarioLibrary, generated: GenerateScenariosResponse): boolean {
  const changeSummary = summarizeScenarioLibraryChanges(existing.scenarios, generated.scenarios);

  return Boolean(
    changeSummary.added ||
      changeSummary.removed ||
      changeSummary.changed ||
      JSON.stringify(existing.riskSummary) !== JSON.stringify(generated.riskSummary) ||
      JSON.stringify(existing.coverageGaps) !== JSON.stringify(generated.coverageGaps)
  );
}

export function sanitizeLogMessage(value: string): string {
  let redacted = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/password\s*[:=]?\s*[^\s]+/gi, "password [REDACTED]")
    .replace(/token\s*[:=]?\s*[^\s]+/gi, "token [REDACTED]")
    .replace(/apikey\s*[:=]?\s*[^\s]+/gi, "apikey [REDACTED]")
    .replace(/zxcvFDSAqwer1234@/g, "[REDACTED_SECRET]");

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && geminiKey.length >= 8) {
    redacted = redacted.replaceAll(geminiKey, "[REDACTED]");
  }

  const qaSecretKey = process.env.QA_LOCAL_SECRET_KEY?.trim();
  if (qaSecretKey && qaSecretKey.length >= 8) {
    redacted = redacted.replaceAll(qaSecretKey, "[REDACTED]");
  }

  return redacted;
}

export function sanitizeOptionalText(value?: string): string | undefined {
  return value ? sanitizeLogMessage(value) : value;
}

export function sanitizeRunRecord(record: RunRecord): RunRecord {
  return {
    ...record,
    plan: {
      ...record.plan,
      loginPassword: record.plan.loginPassword ? "********" : ""
    }
  };
}

export function sanitizeRunRecordContent(record: RunRecord): RunRecord {
  return {
    ...record,
    currentActivity: sanitizeOptionalText(record.currentActivity),
    currentScenarioTitle: sanitizeOptionalText(record.currentScenarioTitle),
    summary: sanitizeLogMessage(record.summary),
    parsedSteps: record.parsedSteps.map((step) => ({
      ...step,
      rawText: sanitizeLogMessage(step.rawText),
      targetDescription: sanitizeLogMessage(step.targetDescription),
      inputData: sanitizeOptionalText(step.inputData),
      expectedResult: sanitizeOptionalText(step.expectedResult),
      fallbackInterpretation: sanitizeLogMessage(step.fallbackInterpretation)
    })),
    stepResults: record.stepResults.map((stepResult) => ({
      ...stepResult,
      userStepText: sanitizeLogMessage(stepResult.userStepText),
      observedTarget: sanitizeLogMessage(stepResult.observedTarget),
      actionResult: sanitizeLogMessage(stepResult.actionResult),
      notes: sanitizeLogMessage(stepResult.notes),
      screenshotLabel: sanitizeLogMessage(stepResult.screenshotLabel),
      screenshotArtifactId: stepResult.screenshotArtifactId
    }))
  };
}

export function mergeRunRecord(existing: RunRecord, patch: RunRecordPatch): RunRecord {
  return normalizeRunRecord({
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
    events: patch.events ?? existing.events,
    warnings: patch.warnings ?? existing.warnings
  });
}

export function createRunEvent(input: Omit<RunEvent, "id" | "timestamp"> & Partial<Pick<RunEvent, "id" | "timestamp">>): RunEvent {
  return {
    id: input.id ?? createId("run_event"),
    timestamp: input.timestamp ?? new Date().toISOString(),
    phase: input.phase,
    level: input.level,
    message: sanitizeLogMessage(input.message),
    category: input.category,
    stepNumber: input.stepNumber,
    scenarioTitle: input.scenarioTitle
  };
}

export function createExecutionWarning(
  input: Omit<ExecutionWarning, "id" | "timestamp"> & Partial<Pick<ExecutionWarning, "id" | "timestamp">>
): ExecutionWarning {
  return {
    id: input.id ?? createId("warning"),
    timestamp: input.timestamp ?? new Date().toISOString(),
    phase: input.phase,
    message: sanitizeLogMessage(input.message),
    category: input.category,
    stepNumber: input.stepNumber,
    scenarioTitle: input.scenarioTitle,
    recoverable: input.recoverable
  };
}

export function findMatchingScenarioLibrary(libraries: ScenarioLibrary[], plan: RunPlan): ScenarioLibrary | undefined {
  return libraries.find(
    (library) =>
      library.featureArea === plan.featureArea &&
      library.environment === plan.environment &&
      library.targetUrl === plan.targetUrl &&
      library.role === plan.role
  );
}

export function findExistingScenarioLibraryForCreate(
  libraries: ScenarioLibrary[],
  plan: RunPlan,
  libraryName?: string
): ScenarioLibrary | undefined {
  const trimmedName = libraryName?.trim();

  if (!trimmedName) {
    return findMatchingScenarioLibrary(libraries, plan);
  }

  const normalizedName = trimmedName.toLowerCase();

  return libraries.find(
    (library) =>
      library.name.trim().toLowerCase() === normalizedName &&
      library.featureArea === plan.featureArea &&
      library.environment === plan.environment &&
      library.targetUrl === plan.targetUrl &&
      library.role === plan.role
  );
}

export function buildScenarioLibraryRecord(
  existing: ScenarioLibrary | undefined,
  plan: RunPlan,
  generated: GenerateScenariosResponse,
  now: string,
  sourceRunId?: string,
  libraryName?: string,
  libraryAuthor?: string,
  sourceRunInsights?: AnalysisInsight[]
): ScenarioLibrary {
  const nextVersion = existing ? (hasScenarioLibraryChanges(existing, generated) ? existing.version + 1 : existing.version) : 1;
  const nextVersions = existing
    ? nextVersion === existing.version
      ? existing.versions
      : [
          ...existing.versions,
          createScenarioLibraryVersion(nextVersion, existing.scenarios, generated.scenarios, now, sourceRunId ?? existing.sourceRunId, sourceRunInsights)
        ]
    : [createInitialScenarioLibraryVersion(generated.scenarios, now, sourceRunId, sourceRunInsights)];

  return {
    id: existing?.id ?? createId("scenario_library"),
    name: libraryName?.trim() || existing?.name || createScenarioLibraryName(plan),
    author: libraryAuthor ?? existing?.author ?? "",
    status: existing?.status ?? "active",
    sourceRunId: sourceRunId ?? existing?.sourceRunId,
    featureArea: plan.featureArea,
    environment: plan.environment,
    targetUrl: plan.targetUrl,
    role: plan.role,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    version: nextVersion,
    versions: nextVersions,
    scenarios: generated.scenarios,
    riskSummary: generated.riskSummary,
    coverageGaps: generated.coverageGaps
  };
}

export function sortRuns(runs: RunRecord[]): RunRecord[] {
  return [...runs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function sortScenarioLibraries(libraries: ScenarioLibrary[]): ScenarioLibrary[] {
  return [...libraries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function sortEnvironmentLibraries(libraries: EnvironmentLibraryRecord[]): EnvironmentLibraryRecord[] {
  return [...libraries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function sortCredentialLibraries(libraries: StoredCredentialLibraryRecord[]): StoredCredentialLibraryRecord[] {
  return [...libraries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function isTerminalRunStatus(status: RunStatus): boolean {
  return ["pass", "fail", "blocked", "cancelled", "inconclusive"].includes(status);
}