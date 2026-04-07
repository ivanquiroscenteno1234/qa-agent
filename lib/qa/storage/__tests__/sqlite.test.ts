import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers — apply migrations to any Database instance
// ---------------------------------------------------------------------------

const migrationsDirectory = path.resolve(
  process.cwd(),
  "lib",
  "qa",
  "storage",
  "migrations"
);

function applyAllMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const files = readdirSync(migrationsDirectory)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedRows = db
    .prepare("SELECT id FROM schema_migrations ORDER BY id")
    .all() as Array<{ id: string }>;
  const applied = new Set(appliedRows.map((r) => r.id));

  for (const fileName of files) {
    if (applied.has(fileName)) {
      continue;
    }

    const sql = readFileSync(path.join(migrationsDirectory, fileName), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db
        .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
        .run(fileName, new Date().toISOString());
    })();
  }
}

function openTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyAllMigrations(db);
  return db;
}

// ---------------------------------------------------------------------------
// Minimal helpers to write a run to the normalized tables
// (mirrors the real logic without importing the full sqlite module that has a
// global singleton and side-effecting seeding)
// ---------------------------------------------------------------------------

function insertRun(
  db: Database.Database,
  id: string,
  mode = "exploratory-run"
): void {
  const now = new Date().toISOString();
  const payload = JSON.stringify({ id, createdAt: now, status: "draft", plan: { mode } });
  db.prepare(
    "INSERT INTO runs (id, created_at, updated_at, status, payload) VALUES (?, ?, ?, ?, ?)"
  ).run(id, now, now, "draft", payload);

  db.prepare(
    `INSERT INTO run_details (
      run_id, current_phase, summary, feature_area, environment,
      target_url, mode, role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, "intake", "created", "checkout", "staging", "https://example.com", mode, "tester");

  db.prepare(
    `INSERT INTO run_metrics (
      run_id, parsed_step_count, generated_scenario_count,
      step_result_count, artifact_count, defect_count
    ) VALUES (?, 0, 0, 0, 0, 0)`
  ).run(id);
}

function insertRunEvent(
  db: Database.Database,
  eventId: string,
  runId: string
): void {
  db.prepare(
    `INSERT INTO run_events (id, run_id, timestamp, phase, level, message)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(eventId, runId, new Date().toISOString(), "intake", "info", "Run created.");
}

// ---------------------------------------------------------------------------
// Gap 6.3 tests
// ---------------------------------------------------------------------------

describe("sqlite — migrations", () => {
  it("applies all migrations cleanly to an empty database", () => {
    const db = openTestDb();
    const rows = db
      .prepare("SELECT id FROM schema_migrations ORDER BY id")
      .all() as Array<{ id: string }>;
    const ids = rows.map((r) => r.id);

    // Expect all 8 migration files to be recorded
    expect(ids).toHaveLength(8);
    expect(ids[0]).toMatch(/^001_/);
    expect(ids[7]).toMatch(/^008_/);
    db.close();
  });

  it("re-running applyAllMigrations is safe because already-applied files are skipped", () => {
    const db = openTestDb();
    // First pass is done in openTestDb(). Run again — the schema_migrations guard
    // prevents re-executing ALTER TABLE statements that would throw.
    const countBefore = (
      db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get() as { n: number }
    ).n;
    // Second call must not throw and must not insert duplicate rows
    applyAllMigrations(db);
    const countAfter = (
      db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get() as { n: number }
    ).n;
    expect(countAfter).toBe(countBefore);
    db.close();
  });
});

describe("sqlite — create and read a run record", () => {
  it("inserted run row can be read back", () => {
    const db = openTestDb();
    insertRun(db, "run_test_001");

    const row = db
      .prepare("SELECT id, payload FROM runs WHERE id = ?")
      .get("run_test_001") as { id: string; payload: string } | undefined;

    expect(row).toBeDefined();
    expect(row?.id).toBe("run_test_001");
    const parsed = JSON.parse(row!.payload);
    expect(parsed.status).toBe("draft");
    db.close();
  });

  it("run_details row is present after insert", () => {
    const db = openTestDb();
    insertRun(db, "run_test_002");

    const detail = db
      .prepare("SELECT feature_area FROM run_details WHERE run_id = ?")
      .get("run_test_002") as { feature_area: string } | undefined;

    expect(detail?.feature_area).toBe("checkout");
    db.close();
  });

  it("run_metrics row is present after insert", () => {
    const db = openTestDb();
    insertRun(db, "run_test_003");

    const metrics = db
      .prepare("SELECT artifact_count FROM run_metrics WHERE run_id = ?")
      .get("run_test_003") as { artifact_count: number } | undefined;

    expect(metrics?.artifact_count).toBe(0);
    db.close();
  });
});

describe("sqlite — delete run cascades to normalized tables", () => {
  it("deleting a run removes run_details, run_events, and run_metrics via CASCADE", () => {
    const db = openTestDb();
    insertRun(db, "run_cascade_001");
    insertRunEvent(db, "evt_001", "run_cascade_001");

    // Confirm rows exist
    expect((db.prepare("SELECT id FROM runs WHERE id = ?").get("run_cascade_001") as { id: string } | undefined)).toBeDefined();
    expect((db.prepare("SELECT run_id FROM run_details WHERE run_id = ?").get("run_cascade_001") as { run_id: string } | undefined)).toBeDefined();
    expect((db.prepare("SELECT id FROM run_events WHERE run_id = ?").get("run_cascade_001") as { id: string } | undefined)).toBeDefined();
    expect((db.prepare("SELECT run_id FROM run_metrics WHERE run_id = ?").get("run_cascade_001") as { run_id: string } | undefined)).toBeDefined();

    // Delete the run
    db.prepare("DELETE FROM runs WHERE id = ?").run("run_cascade_001");

    // All normalized rows must be gone via FK CASCADE
    expect(db.prepare("SELECT id FROM runs WHERE id = ?").get("run_cascade_001")).toBeUndefined();
    expect(db.prepare("SELECT run_id FROM run_details WHERE run_id = ?").get("run_cascade_001")).toBeUndefined();
    expect(db.prepare("SELECT id FROM run_events WHERE run_id = ?").get("run_cascade_001")).toBeUndefined();
    expect(db.prepare("SELECT run_id FROM run_metrics WHERE run_id = ?").get("run_cascade_001")).toBeUndefined();
    db.close();
  });

  it("deleting one run does not affect other runs", () => {
    const db = openTestDb();
    insertRun(db, "run_keep");
    insertRun(db, "run_delete");

    db.prepare("DELETE FROM runs WHERE id = ?").run("run_delete");

    expect(db.prepare("SELECT id FROM runs WHERE id = ?").get("run_keep")).toBeDefined();
    db.close();
  });
});

describe("sqlite — environment library CRUD", () => {
  it("inserts and reads an environment library", () => {
    const db = openTestDb();
    const now = new Date().toISOString();
    const record = {
      id: "env_001",
      name: "Staging",
      targetUrl: "https://staging.example.com",
      environment: "staging",
      role: "admin",
      browser: "chromium",
      device: "desktop",
      safeMode: false,
      riskLevel: "medium",
      notes: "",
      createdAt: now,
      updatedAt: now
    };
    db.prepare(
      "INSERT INTO environment_libraries (id, name, updated_at, payload) VALUES (?, ?, ?, ?)"
    ).run(record.id, record.name, record.updatedAt, JSON.stringify(record));

    const row = db
      .prepare("SELECT id, payload FROM environment_libraries WHERE id = ?")
      .get("env_001") as { id: string; payload: string } | undefined;

    expect(row).toBeDefined();
    const parsed = JSON.parse(row!.payload);
    expect(parsed.name).toBe("Staging");
    db.close();
  });

  it("updates an environment library in-place via ON CONFLICT", () => {
    const db = openTestDb();
    const now = new Date().toISOString();
    const insert = db.prepare(
      "INSERT INTO environment_libraries (id, name, updated_at, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, payload = excluded.payload"
    );
    insert.run("env_002", "Old Name", now, JSON.stringify({ name: "Old Name" }));
    insert.run("env_002", "New Name", now, JSON.stringify({ name: "New Name" }));

    const row = db
      .prepare("SELECT payload FROM environment_libraries WHERE id = ?")
      .get("env_002") as { payload: string };
    expect(JSON.parse(row.payload).name).toBe("New Name");
    db.close();
  });

  it("deletes an environment library", () => {
    const db = openTestDb();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO environment_libraries (id, name, updated_at, payload) VALUES (?, ?, ?, ?)"
    ).run("env_003", "Delete Me", now, "{}");
    db.prepare("DELETE FROM environment_libraries WHERE id = ?").run("env_003");
    expect(db.prepare("SELECT id FROM environment_libraries WHERE id = ?").get("env_003")).toBeUndefined();
    db.close();
  });
});

describe("sqlite — credential library CRUD", () => {
  it("inserts and reads a credential library", () => {
    const db = openTestDb();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO credential_libraries (id, label, updated_at, payload) VALUES (?, ?, ?, ?)"
    ).run("cred_001", "Admin User", now, JSON.stringify({ label: "Admin User" }));

    const row = db
      .prepare("SELECT payload FROM credential_libraries WHERE id = ?")
      .get("cred_001") as { payload: string } | undefined;
    expect(JSON.parse(row!.payload).label).toBe("Admin User");
    db.close();
  });

  it("deletes a credential library", () => {
    const db = openTestDb();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO credential_libraries (id, label, updated_at, payload) VALUES (?, ?, ?, ?)"
    ).run("cred_002", "Temp Cred", now, "{}");
    db.prepare("DELETE FROM credential_libraries WHERE id = ?").run("cred_002");
    expect(db.prepare("SELECT id FROM credential_libraries WHERE id = ?").get("cred_002")).toBeUndefined();
    db.close();
  });
});
