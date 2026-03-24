CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs (status);

CREATE TABLE IF NOT EXISTS scenario_libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scenario_libraries_updated_at ON scenario_libraries (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_libraries_name ON scenario_libraries (name);