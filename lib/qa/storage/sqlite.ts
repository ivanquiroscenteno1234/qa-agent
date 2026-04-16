import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

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
  Scenario,
  ScenarioLibrary,
  StoredCredentialLibraryRecord
} from "@/lib/types";
import { buildScenarioLibraryComparison } from "@/lib/qa/scenario-library";
import { generateScenariosWithLlm } from "@/lib/qa/scenario-generator";
import { parseStepsWithLlm } from "@/lib/qa/step-parser";
import { readSeedDataFromJsonStoreSync } from "@/lib/qa/storage/json-store";
import { dataDirectory, sqliteDatabasePath, sqliteMigrationsDirectory } from "@/lib/qa/storage/paths";
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

type RunRow = { id: string; payload: string };
type ScenarioLibraryRow = { id: string; payload: string };
type EnvironmentLibraryRow = { id: string; payload: string };
type CredentialLibraryRow = { id: string; payload: string };
type RunDetailsRow = {
  run_id: string;
  started_at: string | null;
  completed_at: string | null;
  cancel_requested_at: string | null;
  current_phase: RunRecord["currentPhase"];
  current_activity: string | null;
  current_step_number: number | null;
  current_scenario_index: number | null;
  current_scenario_title: string | null;
  summary: string;
  feature_area: string;
  environment: string;
  target_url: string;
  mode: RunPlan["mode"];
  browser: string | null;
  role: string;
  scenario_library_id: string | null;
};
type RunEventRow = {
  id: string;
  timestamp: string;
  phase: RunEvent["phase"];
  level: RunEvent["level"];
  message: string;
  category: RunEvent["category"];
  step_number: number | null;
  scenario_title: string | null;
};
type StepResultRow = {
  step_id: string;
  step_number: number;
  user_step_text: string;
  normalized_action: RunRecord["stepResults"][number]["normalizedAction"];
  observed_target: string;
  action_result: string;
  assertion_result: RunRecord["stepResults"][number]["assertionResult"];
  notes: string;
  screenshot_label: string;
  screenshot_artifact_id: string | null;
};
type ScenarioLibraryDetailsRow = {
  library_id: string;
  source_run_id: string | null;
  feature_area: string;
  environment: string;
  target_url: string;
  role: string;
  created_at: string;
  version: number;
  risk_summary_json: string;
  coverage_gaps_json: string;
};
type ScenarioLibraryVersionRow = {
  version: number;
  created_at: string;
  source_run_id: string | null;
  scenario_count: number;
  summary: string;
  change_summary_json: string;
  baseline_insights_json: string;
};
type ScenarioLibraryScenarioRow = {
  scenario_id: string;
  ordinal: number;
  title: string;
  priority: Scenario["priority"];
  type: Scenario["type"];
  prerequisites_json: string;
  steps_json: string;
  expected_result: string;
  risk_rationale: string;
  approved_for_automation: number;
};
type RunMetricsRow = {
  run_id: string;
  parsed_step_count: number;
  generated_scenario_count: number;
  step_result_count: number;
  artifact_count: number;
  defect_count: number;
};
type ArtifactRow = {
  id: string;
  type: Artifact["type"];
  label: string;
  content: string;
};
type RunSummaryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  cancel_requested_at: string | null;
  current_phase: RunRecord["currentPhase"];
  current_activity: string | null;
  current_step_number: number | null;
  current_scenario_index: number | null;
  current_scenario_title: string | null;
  summary: string;
  feature_area: string;
  environment: string;
  target_url: string;
  mode: RunPlan["mode"];
  browser: string | null;
  role: string;
  scenario_library_id: string | null;
  parsed_step_count: number | null;
  generated_scenario_count: number | null;
  step_result_count: number | null;
  artifact_count: number | null;
  defect_count: number | null;
};

let database: Database.Database | null = null;

const runEventsStmtCache = new Map<number, Database.Statement>();
const stepResultsStmtCache = new Map<number, Database.Statement>();
const runArtifactsStmtCache = new Map<number, Database.Statement>();
const scenarioLibraryVersionsStmtCache = new Map<number, Database.Statement>();
const scenarioLibraryScenariosStmtCache = new Map<number, Database.Statement>();

const readRunDetailsStmt = new WeakMap<Database.Database, Database.Statement>();
const readRunMetricsStmt = new WeakMap<Database.Database, Database.Statement>();
const readRunEventsStmt = new WeakMap<Database.Database, Database.Statement>();
const readStepResultsStmt = new WeakMap<Database.Database, Database.Statement>();
const readRunArtifactsStmt = new WeakMap<Database.Database, Database.Statement>();
const readScenarioLibraryDetailsStmt = new WeakMap<Database.Database, Database.Statement>();
const readScenarioLibraryVersionsStmt = new WeakMap<Database.Database, Database.Statement>();
const readScenarioLibraryScenariosStmt = new WeakMap<Database.Database, Database.Statement>();

function readRunDetails(db: Database.Database, runId: string): RunDetailsRow | undefined {
  let stmt = readRunDetailsStmt.get(db);
  if (!stmt) {
    stmt = db.prepare(
      `SELECT
        run_id,
        started_at,
        completed_at,
        cancel_requested_at,
        current_phase,
        current_activity,
        current_step_number,
        current_scenario_index,
        current_scenario_title,
        summary,
        feature_area,
        environment,
        target_url,
        mode,
        browser,
        role,
        scenario_library_id
      FROM run_details
      WHERE run_id = ?`
    );
    readRunDetailsStmt.set(db, stmt);
  }
  return stmt.get(runId) as RunDetailsRow | undefined;
}

function readRunMetrics(db: Database.Database, runId: string): RunMetricsRow | undefined {
  let stmt = readRunMetricsStmt.get(db);
  if (!stmt) {
    stmt = db.prepare(
      `SELECT
        run_id,
        parsed_step_count,
        generated_scenario_count,
        step_result_count,
        artifact_count,
        defect_count
      FROM run_metrics
      WHERE run_id = ?`
    );
    readRunMetricsStmt.set(db, stmt);
  }
  return stmt.get(runId) as RunMetricsRow | undefined;
}

function readRunEvents(db: Database.Database, runId: string): RunEvent[] {
  const rows = db.prepare(
    `SELECT
      id,
      timestamp,
      phase,
      level,
      message,
      category,
      step_number,
      scenario_title
    FROM run_events
    WHERE run_id = ?
    ORDER BY timestamp ASC, id ASC`
  ).all(runId) as RunEventRow[];

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    phase: row.phase,
    level: row.level,
    message: row.message,
    category: row.category,
    stepNumber: row.step_number ?? undefined,
    scenarioTitle: row.scenario_title ?? undefined
  }));
}

function readStepResults(db: Database.Database, runId: string): RunRecord["stepResults"] {
  const rows = db.prepare(
    `SELECT
      step_id,
      step_number,
      user_step_text,
      normalized_action,
      observed_target,
      action_result,
      assertion_result,
      notes,
      screenshot_label,
      screenshot_artifact_id
    FROM step_results
    WHERE run_id = ?
    ORDER BY step_number ASC, step_id ASC`
  ).all(runId) as StepResultRow[];

  return rows.map((row) => ({
    stepId: row.step_id,
    stepNumber: row.step_number,
    userStepText: row.user_step_text,
    normalizedAction: row.normalized_action,
    observedTarget: row.observed_target,
    actionResult: row.action_result,
    assertionResult: row.assertion_result,
    notes: row.notes,
    screenshotLabel: row.screenshot_label,
    screenshotArtifactId: row.screenshot_artifact_id ?? undefined
  }));
}

function readRunArtifacts(db: Database.Database, runId: string): Artifact[] {
  let stmt = readRunArtifactsStmt.get(db);
  if (!stmt) {
    stmt = db.prepare(
      `SELECT
        id,
        type,
        label,
        content
      FROM run_artifacts
      WHERE run_id = ?
      ORDER BY ordinal ASC, id ASC`
    );
    readRunArtifactsStmt.set(db, stmt);
  }
  const rows = stmt.all(runId) as ArtifactRow[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    label: row.label,
    content: row.content
  }));
}

const readRunArtifactStmt = new WeakMap<Database.Database, Database.Statement>();
function readRunArtifact(db: Database.Database, runId: string, artifactId: string): Artifact | undefined {
  let stmt = readRunArtifactStmt.get(db);
  if (!stmt) {
    stmt = db.prepare(
      `SELECT id, type, label, content
      FROM run_artifacts
      WHERE run_id = ? AND id = ?`
    );
    readRunArtifactStmt.set(db, stmt);
  }
  const row = stmt.get(runId, artifactId) as ArtifactRow | undefined;

  return row
    ? {
        id: row.id,
        type: row.type,
        label: row.label,
        content: row.content
      }
    : undefined;
}

function readScenarioLibraryDetails(db: Database.Database, libraryId: string): ScenarioLibraryDetailsRow | undefined {
  let stmt = readScenarioLibraryDetailsStmt.get(db);
  if (!stmt) {
    stmt = db.prepare(
      `SELECT
        library_id,
        source_run_id,
        feature_area,
        environment,
        target_url,
        role,
        created_at,
        version,
        risk_summary_json,
        coverage_gaps_json
      FROM scenario_library_details
      WHERE library_id = ?`
    );
    readScenarioLibraryDetailsStmt.set(db, stmt);
  }
  return stmt.get(libraryId) as ScenarioLibraryDetailsRow | undefined;
}

function readScenarioLibraryVersions(db: Database.Database, libraryId: string): ScenarioLibrary["versions"] {
  let stmt = readScenarioLibraryVersionsStmt.get(db);
  if (!stmt) {
    stmt = db.prepare(
      `SELECT
        version,
        created_at,
        source_run_id,
        scenario_count,
        summary,
        change_summary_json,
        baseline_insights_json
      FROM scenario_library_versions
      WHERE library_id = ?
      ORDER BY version ASC`
    );
    readScenarioLibraryVersionsStmt.set(db, stmt);
  }
  const rows = stmt.all(libraryId) as ScenarioLibraryVersionRow[];

  return rows.map((row) => {
    const baselineInsights = JSON.parse(row.baseline_insights_json || '[]') as AnalysisInsight[];
    return {
      version: row.version,
      createdAt: row.created_at,
      sourceRunId: row.source_run_id ?? undefined,
      scenarioCount: row.scenario_count,
      summary: row.summary,
      changeSummary: JSON.parse(row.change_summary_json) as ScenarioLibrary["versions"][number]["changeSummary"],
      ...(baselineInsights.length ? { baselineInsights } : {})
    };
  });
}

function readScenarioLibraryScenarios(db: Database.Database, libraryId: string): Scenario[] {
  const rows = db.prepare(
    `SELECT
      scenario_id,
      ordinal,
      title,
      priority,
      type,
      prerequisites_json,
      steps_json,
      expected_result,
      risk_rationale,
      approved_for_automation
    FROM scenario_library_scenarios
    WHERE library_id = ?
    ORDER BY ordinal ASC, scenario_id ASC`
  ).all(libraryId) as ScenarioLibraryScenarioRow[];

  return rows.map((row) => ({
    id: row.scenario_id,
    title: row.title,
    priority: row.priority,
    type: row.type,
    prerequisites: JSON.parse(row.prerequisites_json) as string[],
    steps: JSON.parse(row.steps_json) as string[],
    expectedResult: row.expected_result,
    riskRationale: row.risk_rationale,
    approvedForAutomation: Boolean(row.approved_for_automation)
  }));
}

function mapRunSummaryRow(row: RunSummaryRow): RunSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    cancelRequestedAt: row.cancel_requested_at ?? undefined,
    currentActivity: row.current_activity ?? undefined,
    currentStepNumber: row.current_step_number ?? undefined,
    currentScenarioIndex: row.current_scenario_index ?? undefined,
    currentScenarioTitle: row.current_scenario_title ?? undefined,
    plan: {
      environment: row.environment,
      targetUrl: row.target_url,
      featureArea: row.feature_area,
      mode: row.mode,
      browser: row.browser ?? "Chromium",
      role: row.role,
      scenarioLibraryId: row.scenario_library_id ?? undefined
    },
    status: row.status,
    currentPhase: row.current_phase,
    summary: row.summary,
    counts: {
      parsedSteps: row.parsed_step_count ?? 0,
      generatedScenarios: row.generated_scenario_count ?? 0,
      stepResults: row.step_result_count ?? 0,
      artifacts: row.artifact_count ?? 0,
      defects: row.defect_count ?? 0
    }
  };
}

function listRunSummariesFromSql(db: Database.Database): RunSummary[] {
  const rows = db.prepare(
    `SELECT
      runs.id,
      runs.created_at,
      runs.updated_at,
      runs.status,
      run_details.started_at,
      run_details.completed_at,
      run_details.cancel_requested_at,
      run_details.current_phase,
      run_details.current_activity,
      run_details.current_step_number,
      run_details.current_scenario_index,
      run_details.current_scenario_title,
      run_details.summary,
      run_details.feature_area,
      run_details.environment,
      run_details.target_url,
      run_details.mode,
      run_details.browser,
      run_details.role,
      run_details.scenario_library_id,
      run_metrics.parsed_step_count,
      run_metrics.generated_scenario_count,
      run_metrics.step_result_count,
      run_metrics.artifact_count,
      run_metrics.defect_count
    FROM runs
    INNER JOIN run_details ON run_details.run_id = runs.id
    LEFT JOIN run_metrics ON run_metrics.run_id = runs.id
    ORDER BY runs.created_at DESC`
  ).all() as RunSummaryRow[];

  return rows.map(mapRunSummaryRow);
}

function hydrateRunRecord(db: Database.Database, row: RunRow | undefined): RunRecord | undefined {
  const base = parseRunRow(row);

  if (!base) {
    return undefined;
  }

  const details = readRunDetails(db, base.id);
  const metrics = readRunMetrics(db, base.id);
  const events = readRunEvents(db, base.id);
  const stepResults = readStepResults(db, base.id);
  const artifacts = readRunArtifacts(db, base.id);

  return normalizeRunRecord({
    ...base,
    startedAt: details?.started_at ?? base.startedAt,
    completedAt: details?.completed_at ?? base.completedAt,
    cancelRequestedAt: details?.cancel_requested_at ?? base.cancelRequestedAt,
    currentPhase: details?.current_phase ?? base.currentPhase,
    currentActivity: details?.current_activity ?? base.currentActivity,
    currentStepNumber: details?.current_step_number ?? base.currentStepNumber,
    currentScenarioIndex: details?.current_scenario_index ?? base.currentScenarioIndex,
    currentScenarioTitle: details?.current_scenario_title ?? base.currentScenarioTitle,
    summary: details?.summary ?? base.summary,
    plan: details
      ? {
          ...base.plan,
          featureArea: details.feature_area,
          environment: details.environment,
          targetUrl: details.target_url,
          mode: details.mode,
          browser: details.browser ?? base.plan.browser,
          role: details.role,
          scenarioLibraryId: details.scenario_library_id ?? base.plan.scenarioLibraryId
        }
      : base.plan,
    events: events.length ? events : base.events,
    stepResults: stepResults.length || metrics?.step_result_count === 0 ? stepResults : base.stepResults,
    artifacts: artifacts.length || metrics?.artifact_count === 0 ? artifacts : base.artifacts
  });
}

function hydrateScenarioLibrary(db: Database.Database, row: ScenarioLibraryRow | undefined): ScenarioLibrary | undefined {
  const base = parseScenarioLibraryRow(row);

  if (!base) {
    return undefined;
  }

  const details = readScenarioLibraryDetails(db, base.id);
  const versions = readScenarioLibraryVersions(db, base.id);
  const scenarios = readScenarioLibraryScenarios(db, base.id);

  return normalizeScenarioLibraryRecord({
    ...base,
    sourceRunId: details?.source_run_id ?? base.sourceRunId,
    featureArea: details?.feature_area ?? base.featureArea,
    environment: details?.environment ?? base.environment,
    targetUrl: details?.target_url ?? base.targetUrl,
    role: details?.role ?? base.role,
    createdAt: details?.created_at ?? base.createdAt,
    version: details?.version ?? base.version,
    riskSummary: details ? (JSON.parse(details.risk_summary_json) as string[]) : base.riskSummary,
    coverageGaps: details ? (JSON.parse(details.coverage_gaps_json) as string[]) : base.coverageGaps,
    versions: versions.length ? versions : base.versions,
    scenarios: scenarios.length ? scenarios : base.scenarios
  });
}

function writeNormalizedRunTables(db: Database.Database, run: RunRecord): void {
  db.prepare(
    `INSERT INTO runs (id, created_at, updated_at, status, payload)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      status = excluded.status,
      payload = excluded.payload`
  ).run(run.id, run.createdAt, run.updatedAt, run.status, JSON.stringify(run));

  db.prepare(
    `INSERT INTO run_details (
      run_id,
      started_at,
      completed_at,
      cancel_requested_at,
      current_phase,
      current_activity,
      current_step_number,
      current_scenario_index,
      current_scenario_title,
      summary,
      feature_area,
      environment,
      target_url,
      mode,
      browser,
      role,
      scenario_library_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(run_id) DO UPDATE SET
      started_at = excluded.started_at,
      completed_at = excluded.completed_at,
      cancel_requested_at = excluded.cancel_requested_at,
      current_phase = excluded.current_phase,
      current_activity = excluded.current_activity,
      current_step_number = excluded.current_step_number,
      current_scenario_index = excluded.current_scenario_index,
      current_scenario_title = excluded.current_scenario_title,
      summary = excluded.summary,
      feature_area = excluded.feature_area,
      environment = excluded.environment,
      target_url = excluded.target_url,
      mode = excluded.mode,
        browser = excluded.browser,
      role = excluded.role,
      scenario_library_id = excluded.scenario_library_id`
  ).run(
    run.id,
    run.startedAt ?? null,
    run.completedAt ?? null,
    run.cancelRequestedAt ?? null,
    run.currentPhase,
    run.currentActivity ?? null,
    run.currentStepNumber ?? null,
    run.currentScenarioIndex ?? null,
    run.currentScenarioTitle ?? null,
    run.summary,
    run.plan.featureArea,
    run.plan.environment,
    run.plan.targetUrl,
    run.plan.mode,
    run.plan.browser,
    run.plan.role,
    run.plan.scenarioLibraryId ?? null
  );

  db.prepare(
    `INSERT INTO run_metrics (
      run_id,
      parsed_step_count,
      generated_scenario_count,
      step_result_count,
      artifact_count,
      defect_count
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(run_id) DO UPDATE SET
      parsed_step_count = excluded.parsed_step_count,
      generated_scenario_count = excluded.generated_scenario_count,
      step_result_count = excluded.step_result_count,
      artifact_count = excluded.artifact_count,
      defect_count = excluded.defect_count`
  ).run(
    run.id,
    run.parsedSteps.length,
    run.generatedScenarios.length,
    run.stepResults.length,
    run.artifacts.length,
    run.defects.length
  );

  db.prepare("DELETE FROM run_events WHERE run_id = ?").run(run.id);
  db.prepare("DELETE FROM step_results WHERE run_id = ?").run(run.id);
  db.prepare("DELETE FROM run_artifacts WHERE run_id = ?").run(run.id);

  if (run.events.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < run.events.length; i += chunkSize) {
      const chunk = run.events.slice(i, i + chunkSize);
      let stmt = runEventsStmtCache.get(chunk.length);
      if (!stmt) {
        const placeholders = Array.from({ length: chunk.length }, () => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
        stmt = db.prepare(
          `INSERT INTO run_events (
            id, run_id, timestamp, phase, level, message, category, step_number, scenario_title
          ) VALUES ${placeholders}`
        );
        runEventsStmtCache.set(chunk.length, stmt);
      }
      stmt.run(
        ...chunk.flatMap((event) => [
          event.id,
          run.id,
          event.timestamp,
          event.phase,
          event.level,
          event.message,
          event.category ?? null,
          event.stepNumber ?? null,
          event.scenarioTitle ?? null
        ])
      );
    }
  }

  if (run.stepResults.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < run.stepResults.length; i += chunkSize) {
      const chunk = run.stepResults.slice(i, i + chunkSize);
      let stmt = stepResultsStmtCache.get(chunk.length);
      if (!stmt) {
        const placeholders = Array.from({ length: chunk.length }, () => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
        stmt = db.prepare(
          `INSERT INTO step_results (
            step_id, run_id, step_number, user_step_text, normalized_action, observed_target, action_result, assertion_result, notes, screenshot_label, screenshot_artifact_id
          ) VALUES ${placeholders}`
        );
        stepResultsStmtCache.set(chunk.length, stmt);
      }
      stmt.run(
        ...chunk.flatMap((stepResult) => [
          stepResult.stepId,
          run.id,
          stepResult.stepNumber,
          stepResult.userStepText,
          stepResult.normalizedAction,
          stepResult.observedTarget,
          stepResult.actionResult,
          stepResult.assertionResult,
          stepResult.notes,
          stepResult.screenshotLabel,
          stepResult.screenshotArtifactId ?? null
        ])
      );
    }
  }

  if (run.artifacts.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < run.artifacts.length; i += chunkSize) {
      const chunk = run.artifacts.slice(i, i + chunkSize);
      let stmt = runArtifactsStmtCache.get(chunk.length);
      if (!stmt) {
        const placeholders = Array.from({ length: chunk.length }, () => "(?, ?, ?, ?, ?, ?)").join(", ");
        stmt = db.prepare(
          `INSERT INTO run_artifacts (
            id, run_id, ordinal, type, label, content
          ) VALUES ${placeholders}`
        );
        runArtifactsStmtCache.set(chunk.length, stmt);
      }
      stmt.run(
        ...chunk.flatMap((artifact, chunkIdx) => [
          artifact.id,
          run.id,
          i + chunkIdx,
          artifact.type,
          artifact.label,
          artifact.content
        ])
      );
    }
  }
}

function writeRunRecord(db: Database.Database, run: RunRecord): RunRecord {
  const normalized = sanitizeRunRecordContent(normalizeRunRecord(run));
  const transaction = db.transaction((nextRun: RunRecord) => {
    writeNormalizedRunTables(db, nextRun);
  });
  transaction(normalized);
  return normalized;
}

function writeScenarioLibraryRecord(db: Database.Database, library: ScenarioLibrary): ScenarioLibrary {
  const normalized = normalizeScenarioLibraryRecord(library);
  const transaction = db.transaction((nextLibrary: ScenarioLibrary) => {
    db.prepare(
      "INSERT INTO scenario_libraries (id, name, status, author, updated_at, payload) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, status = excluded.status, author = excluded.author, updated_at = excluded.updated_at, payload = excluded.payload"
    ).run(nextLibrary.id, nextLibrary.name, nextLibrary.status ?? "active", nextLibrary.author ?? "", nextLibrary.updatedAt, JSON.stringify(nextLibrary));

    db.prepare(
      `INSERT INTO scenario_library_details (
        library_id,
        source_run_id,
        feature_area,
        environment,
        target_url,
        role,
        created_at,
        version,
        risk_summary_json,
        coverage_gaps_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(library_id) DO UPDATE SET
        source_run_id = excluded.source_run_id,
        feature_area = excluded.feature_area,
        environment = excluded.environment,
        target_url = excluded.target_url,
        role = excluded.role,
        created_at = excluded.created_at,
        version = excluded.version,
        risk_summary_json = excluded.risk_summary_json,
        coverage_gaps_json = excluded.coverage_gaps_json`
    ).run(
      nextLibrary.id,
      nextLibrary.sourceRunId ?? null,
      nextLibrary.featureArea,
      nextLibrary.environment,
      nextLibrary.targetUrl,
      nextLibrary.role,
      nextLibrary.createdAt,
      nextLibrary.version,
      JSON.stringify(nextLibrary.riskSummary),
      JSON.stringify(nextLibrary.coverageGaps)
    );

    db.prepare("DELETE FROM scenario_library_versions WHERE library_id = ?").run(nextLibrary.id);
    db.prepare("DELETE FROM scenario_library_scenarios WHERE library_id = ?").run(nextLibrary.id);

    // ⚡ Bolt: Batch scenario library versions inserts into chunks of 100
    // This optimization drastically reduces Node.js/C++ boundary crossings,
    // lowering CPU overhead and overall transaction execution time.
    if (nextLibrary.versions.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < nextLibrary.versions.length; i += chunkSize) {
        const chunk = nextLibrary.versions.slice(i, i + chunkSize);
        let stmt = scenarioLibraryVersionsStmtCache.get(chunk.length);
        if (!stmt) {
          const placeholders = Array.from({ length: chunk.length }, () => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
          stmt = db.prepare(
            `INSERT INTO scenario_library_versions (
              library_id,
              version,
              created_at,
              source_run_id,
              scenario_count,
              summary,
              change_summary_json,
              baseline_insights_json
            ) VALUES ${placeholders}`
          );
          scenarioLibraryVersionsStmtCache.set(chunk.length, stmt);
        }
        stmt.run(
          ...chunk.flatMap((version) => [
            nextLibrary.id,
            version.version,
            version.createdAt,
            version.sourceRunId ?? null,
            version.scenarioCount,
            version.summary,
            JSON.stringify(version.changeSummary),
            JSON.stringify(version.baselineInsights ?? [])
          ])
        );
      }
    }

    // ⚡ Bolt: Batch scenario library scenario inserts into chunks of 100
    // Multi-row batching here prevents the N+1 anti-pattern of executing a single
    // `stmt.run()` per scenario within the transaction loop, improving throughput by ~100x.
    if (nextLibrary.scenarios.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < nextLibrary.scenarios.length; i += chunkSize) {
        const chunk = nextLibrary.scenarios.slice(i, i + chunkSize);
        let stmt = scenarioLibraryScenariosStmtCache.get(chunk.length);
        if (!stmt) {
          const placeholders = Array.from({ length: chunk.length }, () => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
          stmt = db.prepare(
            `INSERT INTO scenario_library_scenarios (
              scenario_id,
              library_id,
              ordinal,
              title,
              priority,
              type,
              prerequisites_json,
              steps_json,
              expected_result,
              risk_rationale,
              approved_for_automation
            ) VALUES ${placeholders}`
          );
          scenarioLibraryScenariosStmtCache.set(chunk.length, stmt);
        }
        stmt.run(
          ...chunk.flatMap((scenario, chunkIdx) => [
            scenario.id,
            nextLibrary.id,
            i + chunkIdx,
            scenario.title,
            scenario.priority,
            scenario.type,
            JSON.stringify(scenario.prerequisites),
            JSON.stringify(scenario.steps),
            scenario.expectedResult,
            scenario.riskRationale,
            scenario.approvedForAutomation ? 1 : 0
          ])
        );
      }
    }
  });

  transaction(normalized);

  return normalized;
}

function openDatabase(): Database.Database {
  if (database) {
    return database;
  }

  mkdirSync(dataDirectory, { recursive: true });
  const db = new Database(sqliteDatabasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationFiles = readdirSync(sqliteMigrationsDirectory)
    .filter((entry) => entry.endsWith(".sql"))
    .sort();
  const appliedRows = db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as Array<{ id: string }>;
  const applied = new Set(appliedRows.map((row) => row.id));

  for (const fileName of migrationFiles) {
    if (applied.has(fileName)) {
      continue;
    }

    const sql = readFileSync(path.join(sqliteMigrationsDirectory, fileName), "utf8");
    const transaction = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(fileName, new Date().toISOString());
    });
    transaction();
  }

  const runCount = Number((db.prepare("SELECT COUNT(*) AS count FROM runs").get() as { count: number }).count);
  const libraryCount = Number((db.prepare("SELECT COUNT(*) AS count FROM scenario_libraries").get() as { count: number }).count);

  if (runCount === 0 && libraryCount === 0) {
    const seed = db.transaction(() => {
      const data = readSeedDataFromJsonStoreSync();

      for (const run of data.runs) {
        writeRunRecord(db, run);
      }

      for (const library of data.scenarioLibraries) {
        writeScenarioLibraryRecord(db, library);
      }

      for (const environmentLibrary of data.environmentLibraries) {
        writeEnvironmentLibraryRecord(db, environmentLibrary);
      }

      for (const credentialLibrary of data.credentialLibraries) {
        writeStoredCredentialLibraryRecord(db, credentialLibrary);
      }
    });

    seed();
  }

  database = db;
  return db;
}

function parseRunRow(row: RunRow | undefined): RunRecord | undefined {
  return row ? normalizeRunRecord(JSON.parse(row.payload) as RunRecord) : undefined;
}

function parseScenarioLibraryRow(row: ScenarioLibraryRow | undefined): ScenarioLibrary | undefined {
  return row ? normalizeScenarioLibraryRecord(JSON.parse(row.payload) as ScenarioLibrary) : undefined;
}

function parseEnvironmentLibraryRow(row: EnvironmentLibraryRow | undefined): EnvironmentLibraryRecord | undefined {
  return row ? normalizeEnvironmentLibraryRecord(JSON.parse(row.payload) as EnvironmentLibraryRecord) : undefined;
}

function parseCredentialLibraryRow(row: CredentialLibraryRow | undefined): StoredCredentialLibraryRecord | undefined {
  return row ? normalizeStoredCredentialLibraryRecord(JSON.parse(row.payload) as StoredCredentialLibraryRecord) : undefined;
}

function writeEnvironmentLibraryRecord(db: Database.Database, library: EnvironmentLibraryRecord): EnvironmentLibraryRecord {
  const normalized = normalizeEnvironmentLibraryRecord(library);
  db.prepare(
    "INSERT INTO environment_libraries (id, name, updated_at, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, payload = excluded.payload"
  ).run(normalized.id, normalized.name, normalized.updatedAt, JSON.stringify(normalized));
  return normalized;
}

function writeStoredCredentialLibraryRecord(db: Database.Database, library: StoredCredentialLibraryRecord): StoredCredentialLibraryRecord {
  const normalized = normalizeStoredCredentialLibraryRecord(library);
  db.prepare(
    "INSERT INTO credential_libraries (id, label, updated_at, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET label = excluded.label, updated_at = excluded.updated_at, payload = excluded.payload"
  ).run(normalized.id, normalized.label, normalized.updatedAt, JSON.stringify(normalized));
  return normalized;
}

function createSqliteStoreBackend(): QaStoreBackend {
  function listRunsInternal(): RunRecord[] {
    const db = openDatabase();
    const rows = db.prepare("SELECT id, payload FROM runs ORDER BY created_at DESC").all() as RunRow[];
    return sortRuns(rows.map((row) => hydrateRunRecord(db, row)).filter((run): run is RunRecord => Boolean(run)));
  }

  function getRunInternal(runId: string): RunRecord | undefined {
    const db = openDatabase();
    return hydrateRunRecord(db, db.prepare("SELECT id, payload FROM runs WHERE id = ?").get(runId) as RunRow | undefined);
  }

  function writeRun(run: RunRecord): RunRecord {
    const db = openDatabase();
    return writeRunRecord(db, run);
  }

  function listScenarioLibrariesInternal(): ScenarioLibrary[] {
    const db = openDatabase();
    const rows = db.prepare("SELECT id, payload FROM scenario_libraries ORDER BY updated_at DESC").all() as ScenarioLibraryRow[];
    return sortScenarioLibraries(rows.map((row) => hydrateScenarioLibrary(db, row)).filter((library): library is ScenarioLibrary => Boolean(library)));
  }

  function getScenarioLibraryInternal(scenarioLibraryId: string): ScenarioLibrary | undefined {
    const db = openDatabase();
    return hydrateScenarioLibrary(db, db.prepare("SELECT id, payload FROM scenario_libraries WHERE id = ?").get(scenarioLibraryId) as ScenarioLibraryRow | undefined);
  }

  function writeScenarioLibrary(library: ScenarioLibrary): ScenarioLibrary {
    const db = openDatabase();
    return writeScenarioLibraryRecord(db, library);
  }

  function listEnvironmentLibrariesInternal(): EnvironmentLibraryRecord[] {
    const db = openDatabase();
    const rows = db.prepare("SELECT id, payload FROM environment_libraries ORDER BY updated_at DESC").all() as EnvironmentLibraryRow[];
    return sortEnvironmentLibraries(rows.map((row) => parseEnvironmentLibraryRow(row)).filter((library): library is EnvironmentLibraryRecord => Boolean(library)));
  }

  function getEnvironmentLibraryInternal(environmentLibraryId: string): EnvironmentLibraryRecord | undefined {
    const db = openDatabase();
    return parseEnvironmentLibraryRow(
      db.prepare("SELECT id, payload FROM environment_libraries WHERE id = ?").get(environmentLibraryId) as EnvironmentLibraryRow | undefined
    );
  }

  function writeEnvironmentLibrary(library: EnvironmentLibraryRecord): EnvironmentLibraryRecord {
    const db = openDatabase();
    return writeEnvironmentLibraryRecord(db, library);
  }

  function listStoredCredentialLibrariesInternal(): StoredCredentialLibraryRecord[] {
    const db = openDatabase();
    const rows = db.prepare("SELECT id, payload FROM credential_libraries ORDER BY updated_at DESC").all() as CredentialLibraryRow[];
    return sortCredentialLibraries(rows.map((row) => parseCredentialLibraryRow(row)).filter((library): library is StoredCredentialLibraryRecord => Boolean(library)));
  }

  function getStoredCredentialLibraryInternal(credentialLibraryId: string): StoredCredentialLibraryRecord | undefined {
    const db = openDatabase();
    return parseCredentialLibraryRow(
      db.prepare("SELECT id, payload FROM credential_libraries WHERE id = ?").get(credentialLibraryId) as CredentialLibraryRow | undefined
    );
  }

  function writeStoredCredentialLibrary(library: StoredCredentialLibraryRecord): StoredCredentialLibraryRecord {
    const db = openDatabase();
    return writeStoredCredentialLibraryRecord(db, library);
  }

  function protectStoredCredentialLibrary(library: StoredCredentialLibraryRecord | undefined): StoredCredentialLibraryRecord | undefined {
    if (!library || library.secretMode !== "stored-secret" || !needsCredentialSecretProtection(library.password)) {
      return library;
    }

    return writeStoredCredentialLibrary({
      ...library,
      password: protectCredentialSecret(library.password)
    });
  }

  function mutateRun(runId: string, mutate: (run: RunRecord) => RunRecord): RunRecord | undefined {
    const existing = getRunInternal(runId);
    return existing ? writeRun(mutate(existing)) : undefined;
  }

  return {
    async listEnvironmentLibraries(): Promise<EnvironmentLibraryRecord[]> {
      return listEnvironmentLibrariesInternal();
    },
    async getEnvironmentLibrary(environmentLibraryId: string): Promise<EnvironmentLibraryRecord | undefined> {
      return getEnvironmentLibraryInternal(environmentLibraryId);
    },
    async upsertEnvironmentLibrary(input: EnvironmentLibraryInput, environmentLibraryId?: string): Promise<EnvironmentLibraryRecord> {
      const existing = environmentLibraryId ? getEnvironmentLibraryInternal(environmentLibraryId) : undefined;
      return writeEnvironmentLibrary(buildEnvironmentLibraryRecord(existing, input, new Date().toISOString()));
    },
    async listCredentialLibraries(): Promise<CredentialLibraryRecord[]> {
      return listStoredCredentialLibrariesInternal()
        .map((library) => protectStoredCredentialLibrary(library) ?? library)
        .map(sanitizeCredentialLibraryRecord);
    },
    async getCredentialLibrary(credentialLibraryId: string): Promise<CredentialLibraryRecord | undefined> {
      const credential = protectStoredCredentialLibrary(getStoredCredentialLibraryInternal(credentialLibraryId));
      return credential ? sanitizeCredentialLibraryRecord(credential) : undefined;
    },
    async getStoredCredentialLibrary(credentialLibraryId: string): Promise<StoredCredentialLibraryRecord | undefined> {
      return protectStoredCredentialLibrary(getStoredCredentialLibraryInternal(credentialLibraryId));
    },
    async upsertCredentialLibrary(input: CredentialLibraryInput, credentialLibraryId?: string): Promise<CredentialLibraryRecord> {
      const existing = credentialLibraryId ? getStoredCredentialLibraryInternal(credentialLibraryId) : undefined;
      const credential = writeStoredCredentialLibrary(buildStoredCredentialLibraryRecord(existing, input, new Date().toISOString()));
      return sanitizeCredentialLibraryRecord(credential);
    },
    async touchCredentialLibraryLastUsed(credentialLibraryId: string, usedAt?: string): Promise<CredentialLibraryRecord | undefined> {
      const existing = getStoredCredentialLibraryInternal(credentialLibraryId);

      if (!existing) {
        return undefined;
      }

      const credential = writeStoredCredentialLibrary({
        ...existing,
        lastUsedAt: usedAt ?? new Date().toISOString()
      });

      return sanitizeCredentialLibraryRecord(credential);
    },
    async listScenarioLibraries(options?: { includeArchived?: boolean }): Promise<ScenarioLibrary[]> {
      const all = listScenarioLibrariesInternal();
      return options?.includeArchived ? all : all.filter((l) => (l.status ?? "active") === "active");
    },
    async getScenarioLibrary(scenarioLibraryId: string): Promise<ScenarioLibrary | undefined> {
      return getScenarioLibraryInternal(scenarioLibraryId);
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
      const libraries = listScenarioLibrariesInternal();
      const now = new Date().toISOString();
      const existing = scenarioLibraryId
        ? libraries.find((library) => library.id === scenarioLibraryId)
        : findExistingScenarioLibraryForCreate(libraries, plan, libraryName);
      return writeScenarioLibrary(buildScenarioLibraryRecord(existing, plan, generated, now, sourceRunId, libraryName, libraryAuthor, sourceRunInsights));
    },
    async listRuns(): Promise<RunRecord[]> {
      return listRunsInternal();
    },
    async listRunSummaries(options?: import("@/lib/qa/storage/types").ListRunSummariesOptions): Promise<RunSummary[]> {
      const db = openDatabase();
      let summaries = listRunSummariesFromSql(db);
      if (!summaries.length) {
        summaries = listRunsInternal().map(buildRunSummary);
      }
      if (options?.statusFilter) {
        summaries = summaries.filter((s) => s.status === options.statusFilter);
      }
      if (options?.cursor) {
        const idx = summaries.findIndex((s) => s.id === options.cursor);
        if (idx !== -1) summaries = summaries.slice(idx + 1);
      }
      if (options?.limit != null && options.limit > 0) {
        summaries = summaries.slice(0, options.limit);
      }
      return summaries;
    },
    async getRun(runId: string): Promise<RunRecord | undefined> {
      return getRunInternal(runId);
    },
    async getRunArtifact(runId: string, artifactId: string): Promise<Artifact | undefined> {
      const db = openDatabase();
      const artifact = readRunArtifact(db, runId, artifactId);

      if (artifact) {
        return artifact;
      }

      const run = getRunInternal(runId);
      return run?.artifacts.find((candidate) => candidate.id === artifactId);
    },
    async updateRunState(runId: string, patch: RunRecordPatch): Promise<RunRecord | undefined> {
      return mutateRun(runId, (run) => mergeRunRecord(run, patch));
    },
    async appendRunEvent(
      runId: string,
      event: Omit<RunEvent, "id" | "timestamp"> & Partial<Pick<RunEvent, "id" | "timestamp">>
    ): Promise<RunRecord | undefined> {
      return mutateRun(runId, (run) => ({ ...run, updatedAt: new Date().toISOString(), events: [...run.events, createRunEvent(event)] }));
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
      const db = openDatabase();
      const events = readRunEvents(db, runId);

      if (events.length) {
        return events;
      }

      const run = getRunInternal(runId);
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
              createRunEvent({ phase: "cancelled", level: "info", message: "Run was cancelled before execution started.", category: "cancelled", timestamp: now })
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
            createRunEvent({ phase: run.currentPhase, level: "warning", message: "Cancellation requested. The run will stop at the next safe boundary.", category: "cancelled", timestamp: now })
          ]
        };
      });
    },
    async createRun(plan: RunPlan): Promise<RunRecord> {
      const parsed = await parseStepsWithLlm(
        plan.stepsText,
        `${plan.featureArea} | ${plan.objective} | ${plan.targetUrl}`
      );
      const scenarioLibraries = listScenarioLibrariesInternal();
      const selectedLibrary = plan.scenarioLibraryId
        ? scenarioLibraries.find((library) => library.id === plan.scenarioLibraryId)
        : undefined;
      const generated = selectedLibrary
        ? { scenarios: selectedLibrary.scenarios, coverageGaps: selectedLibrary.coverageGaps, riskSummary: selectedLibrary.riskSummary }
        : await generateScenariosWithLlm(plan);
      const now = new Date().toISOString();
      return writeRun(sanitizeRunRecordContent({
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
        events: [createRunEvent({ phase: "intake", level: "info", message: "Run created and ready for execution.", category: "system", timestamp: now })],
        warnings: []
      }));
    },
    async saveRun(record: RunRecord): Promise<RunRecord> {
      const scenarioLibraries = record.plan.scenarioLibraryId ? listScenarioLibrariesInternal() : [];
      const existingLibrary = record.plan.scenarioLibraryId
        ? scenarioLibraries.find((library) => library.id === record.plan.scenarioLibraryId)
        : undefined;
      const nextRecord = existingLibrary ? { ...record, scenarioLibraryComparison: buildScenarioLibraryComparison(existingLibrary, record.generatedScenarios) } : record;
      const savedRecord = writeRun(nextRecord);
      if (savedRecord.generatedScenarios.length && savedRecord.plan.scenarioLibraryId && savedRecord.plan.mode !== "regression-run") {
        await this.upsertScenarioLibraryFromRun(
          savedRecord.plan,
          { scenarios: savedRecord.generatedScenarios, coverageGaps: savedRecord.coverageGaps, riskSummary: savedRecord.riskSummary },
          savedRecord.id,
          savedRecord.plan.scenarioLibraryId
        );
      }
      return savedRecord;
    },
    async deleteRun(id: string): Promise<void> {
      const db = openDatabase();
      db.prepare("DELETE FROM runs WHERE id = ?").run(id);
    },
    async deleteCredentialLibrary(id: string): Promise<void> {
      const db = openDatabase();
      const activeCount = (db.prepare(
        "SELECT COUNT(*) AS count FROM runs WHERE JSON_EXTRACT(payload, '$.plan.credentialLibraryId') = ? AND status IN ('queued', 'running')"
      ).get(id) as { count: number }).count;
      if (activeCount > 0) {
        throw new Error("CREDENTIAL_IN_USE");
      }
      db.prepare("DELETE FROM credential_libraries WHERE id = ?").run(id);
    },
    async deleteEnvironmentLibrary(id: string): Promise<void> {
      const db = openDatabase();
      const activeCount = (db.prepare(
        "SELECT COUNT(*) AS count FROM runs WHERE JSON_EXTRACT(payload, '$.plan.environmentLibraryId') = ? AND status IN ('queued', 'running')"
      ).get(id) as { count: number }).count;
      if (activeCount > 0) {
        throw new Error("ENVIRONMENT_IN_USE");
      }
      db.prepare("DELETE FROM environment_libraries WHERE id = ?").run(id);
    },
    async duplicateScenarioLibrary(id: string, newName: string): Promise<ScenarioLibrary> {
      const source = getScenarioLibraryInternal(id);
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
      return writeScenarioLibrary(newLibrary);
    },
    async archiveScenarioLibrary(id: string): Promise<ScenarioLibrary> {
      const db = openDatabase();
      const updatedAt = new Date().toISOString();
      const result = db.prepare(
        "UPDATE scenario_libraries SET status = 'archived', updated_at = ?, payload = JSON_SET(payload, '$.status', 'archived') WHERE id = ?"
      ).run(updatedAt, id);
      if (result.changes === 0) {
        throw new Error("NOT_FOUND");
      }
      const updated = hydrateScenarioLibrary(db, db.prepare("SELECT id, payload FROM scenario_libraries WHERE id = ?").get(id) as ScenarioLibraryRow | undefined);
      if (!updated) {
        throw new Error("NOT_FOUND");
      }
      return updated;
    },
    async renameScenarioLibrary(id: string, name: string): Promise<ScenarioLibrary> {
      const db = openDatabase();
      const updatedAt = new Date().toISOString();
      const result = db.prepare(
        "UPDATE scenario_libraries SET name = ?, updated_at = ?, payload = JSON_SET(payload, '$.name', ?) WHERE id = ?"
      ).run(name, updatedAt, name, id);
      if (result.changes === 0) {
        throw new Error("NOT_FOUND");
      }
      const updated = hydrateScenarioLibrary(db, db.prepare("SELECT id, payload FROM scenario_libraries WHERE id = ?").get(id) as ScenarioLibraryRow | undefined);
      if (!updated) {
        throw new Error("NOT_FOUND");
      }
      return updated;
    },
    async deleteScenarioLibrary(id: string): Promise<void> {
      const db = openDatabase();
      const activeCount = (db.prepare(
        "SELECT COUNT(*) AS count FROM run_details WHERE scenario_library_id = ? AND run_id IN (SELECT id FROM runs WHERE status IN ('queued', 'running'))"
      ).get(id) as { count: number }).count;
      if (activeCount > 0) {
        throw new Error("SCENARIO_LIBRARY_IN_USE");
      }
      db.prepare("DELETE FROM scenario_libraries WHERE id = ?").run(id);
    }
  };
}

export { createSqliteStoreBackend };