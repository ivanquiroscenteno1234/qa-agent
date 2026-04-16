import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const workspaceRoot = process.cwd();
const dataDirectory = path.join(workspaceRoot, ".data");
const dbPath = path.join(dataDirectory, "qa-agent.db");
const runsPath = path.join(dataDirectory, "qa-runs.json");
const librariesPath = path.join(dataDirectory, "qa-scenario-libraries.json");
const migrationsDirectory = path.join(workspaceRoot, "lib", "qa", "storage", "migrations");

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function applyMigrations(db) {
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((entry) => entry.endsWith(".sql"))
    .sort();
  const applied = new Set(db.prepare("SELECT id FROM schema_migrations ORDER BY id").all().map((row) => row.id));

  for (const fileName of migrationFiles) {
    if (applied.has(fileName)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDirectory, fileName), "utf8");
    const transaction = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(fileName, new Date().toISOString());
    });

    transaction();
  }
}

function writeRun(db, run) {
  db.prepare(
    `INSERT OR REPLACE INTO runs (id, created_at, updated_at, status, payload)
     VALUES (?, ?, ?, ?, ?)`
  ).run(run.id, run.createdAt, run.updatedAt, run.status, JSON.stringify(run));

  db.prepare(
    `INSERT OR REPLACE INTO run_details (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    `INSERT OR REPLACE INTO run_metrics (
      run_id,
      parsed_step_count,
      generated_scenario_count,
      step_result_count,
      artifact_count,
      defect_count
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    run.id,
    (run.parsedSteps ?? []).length,
    (run.generatedScenarios ?? []).length,
    (run.stepResults ?? []).length,
    (run.artifacts ?? []).length,
    (run.defects ?? []).length
  );

  const insertEvent = db.prepare(
    `INSERT OR REPLACE INTO run_events (
      id,
      run_id,
      timestamp,
      phase,
      level,
      message,
      category,
      step_number,
      scenario_title
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertStepResult = db.prepare(
    `INSERT OR REPLACE INTO step_results (
      step_id,
      run_id,
      step_number,
      user_step_text,
      normalized_action,
      observed_target,
      action_result,
      assertion_result,
      notes,
      screenshot_label,
      screenshot_artifact_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertArtifact = db.prepare(
    `INSERT OR REPLACE INTO run_artifacts (
      id,
      run_id,
      ordinal,
      type,
      label,
      content
    ) VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const event of run.events ?? []) {
    insertEvent.run(
      event.id,
      run.id,
      event.timestamp,
      event.phase,
      event.level,
      event.message,
      event.category ?? null,
      event.stepNumber ?? null,
      event.scenarioTitle ?? null
    );
  }

  for (const stepResult of run.stepResults ?? []) {
    insertStepResult.run(
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
    );
  }

  (run.artifacts ?? []).forEach((artifact, index) => {
    insertArtifact.run(artifact.id, run.id, index, artifact.type, artifact.label, artifact.content);
  });
}

function writeScenarioLibrary(db, library) {
  db.prepare(
    `INSERT OR REPLACE INTO scenario_libraries (id, name, updated_at, payload)
     VALUES (?, ?, ?, ?)`
  ).run(library.id, library.name, library.updatedAt, JSON.stringify(library));

  db.prepare(
    `INSERT OR REPLACE INTO scenario_library_details (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    library.id,
    library.sourceRunId ?? null,
    library.featureArea,
    library.environment,
    library.targetUrl,
    library.role,
    library.createdAt,
    library.version,
    JSON.stringify(library.riskSummary ?? []),
    JSON.stringify(library.coverageGaps ?? [])
  );

  const insertVersion = db.prepare(
    `INSERT OR REPLACE INTO scenario_library_versions (
      library_id,
      version,
      created_at,
      source_run_id,
      scenario_count,
      summary,
      change_summary_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertScenario = db.prepare(
    `INSERT OR REPLACE INTO scenario_library_scenarios (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const version of library.versions ?? []) {
    insertVersion.run(
      library.id,
      version.version,
      version.createdAt,
      version.sourceRunId ?? null,
      version.scenarioCount,
      version.summary,
      JSON.stringify(version.changeSummary)
    );
  }

  (library.scenarios ?? []).forEach((scenario, index) => {
    insertScenario.run(
      scenario.id,
      library.id,
      index,
      scenario.title,
      scenario.priority,
      scenario.type,
      JSON.stringify(scenario.prerequisites),
      JSON.stringify(scenario.steps),
      scenario.expectedResult,
      scenario.riskRationale,
      scenario.approvedForAutomation ? 1 : 0
    );
  });
}

function main() {
  fs.mkdirSync(dataDirectory, { recursive: true });

  const runs = readJsonArray(runsPath);
  const libraries = readJsonArray(librariesPath);
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  applyMigrations(db);

  const transaction = db.transaction(() => {
    db.exec("DELETE FROM scenario_library_scenarios;");
    db.exec("DELETE FROM scenario_library_versions;");
    db.exec("DELETE FROM scenario_library_details;");
    db.exec("DELETE FROM run_artifacts;");
    db.exec("DELETE FROM run_metrics;");
    db.exec("DELETE FROM step_results;");
    db.exec("DELETE FROM run_events;");
    db.exec("DELETE FROM run_details;");
    db.exec("DELETE FROM runs;");
    db.exec("DELETE FROM scenario_libraries;");

    for (const run of runs) {
      writeRun(db, run);
    }

    for (const library of libraries) {
      writeScenarioLibrary(db, library);
    }
  });

  transaction();

  db.close();
}

main();