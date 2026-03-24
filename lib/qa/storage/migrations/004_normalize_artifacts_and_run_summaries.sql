ALTER TABLE run_details ADD COLUMN browser TEXT;

CREATE TABLE IF NOT EXISTS run_metrics (
  run_id TEXT PRIMARY KEY,
  parsed_step_count INTEGER NOT NULL,
  generated_scenario_count INTEGER NOT NULL,
  step_result_count INTEGER NOT NULL,
  artifact_count INTEGER NOT NULL,
  defect_count INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS run_artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_artifacts_run_ordinal ON run_artifacts (run_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_run_artifacts_run_type ON run_artifacts (run_id, type);