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

// 1. Loop insert
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

const loopTimes = [];
for (let j=0; j<5; j++) {
  const start = performance.now();
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
  loopTimes.push(performance.now() - start);
  db.exec("DELETE FROM run_events");
}
console.log(`Loop Insert: ${loopTimes.reduce((a, b) => a + b) / 5}ms`);


// 2. Batch insert (prepared chunking)
const batchTimes = [];
for (let j=0; j<5; j++) {
  const start = performance.now();
  const transactionBatch = db.transaction(() => {
    const chunkSize = 100;
    // Prepare the statement ONCE per chunk size
    const placeholders = Array.from({length: chunkSize}, () => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
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
    const stmt = db.prepare(sql);

    // Also prepare a smaller chunk statement if needed
    const chunkMap = new Map();
    chunkMap.set(chunkSize, stmt);

    for (let i = 0; i < events.length; i += chunkSize) {
      const chunk = events.slice(i, i + chunkSize);
      let chunkStmt = chunkMap.get(chunk.length);
      if (!chunkStmt) {
        const ph = Array.from({length: chunk.length}, () => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
        chunkStmt = db.prepare(`INSERT INTO run_events (id, run_id, timestamp, phase, level, message, category, step_number, scenario_title) VALUES ${ph}`);
        chunkMap.set(chunk.length, chunkStmt);
      }
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
      chunkStmt.run(...params);
    }
  });
  transactionBatch();
  batchTimes.push(performance.now() - start);
  db.exec("DELETE FROM run_events");
}
console.log(`Prepared Batch Insert: ${batchTimes.reduce((a, b) => a + b) / 5}ms`);
