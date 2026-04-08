import Database from "better-sqlite3";

// Create db in memory
const db = new Database(":memory:");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE run_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    phase TEXT,
    level TEXT,
    message TEXT,
    category TEXT,
    step_number INTEGER,
    scenario_title TEXT
  );
`);

const events = Array.from({ length: 5000 }, (_, i) => ({
  id: `event-${i}`,
  timestamp: new Date().toISOString(),
  phase: "execution",
  level: "info",
  message: `Event message ${i}`,
  category: "test",
  stepNumber: i,
  scenarioTitle: "Scenario"
}));

const runId = "run-1";

// 1. Loop insert (what's currently in sqlite.ts)
const insertEventLoop = db.prepare(
  `INSERT INTO run_events (
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

console.time("Loop Insert");
const transactionLoop = db.transaction(() => {
  for (const event of events) {
    insertEventLoop.run(
      event.id,
      runId,
      event.timestamp,
      event.phase,
      event.level,
      event.message,
      event.category ?? null,
      event.stepNumber ?? null,
      event.scenarioTitle ?? null
    );
  }
});
transactionLoop();
console.timeEnd("Loop Insert");

// Clear table
db.exec("DELETE FROM run_events");

// 2. Batch insert
console.time("Batch Insert");
const transactionBatch = db.transaction(() => {
  const chunkSize = 100; // SQLite limit is 32766 params, so 100 events * 9 = 900 params
  for (let i = 0; i < events.length; i += chunkSize) {
    const chunk = events.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const sql = `INSERT INTO run_events (
      id,
      run_id,
      timestamp,
      phase,
      level,
      message,
      category,
      step_number,
      scenario_title
    ) VALUES ${placeholders}`;
    const params = chunk.flatMap(event => [
      event.id,
      runId,
      event.timestamp,
      event.phase,
      event.level,
      event.message,
      event.category ?? null,
      event.stepNumber ?? null,
      event.scenarioTitle ?? null
    ]);
    db.prepare(sql).run(...params);
  }
});
transactionBatch();
console.timeEnd("Batch Insert");
