CREATE TABLE IF NOT EXISTS run_details (
  run_id TEXT PRIMARY KEY,
  started_at TEXT,
  completed_at TEXT,
  cancel_requested_at TEXT,
  current_phase TEXT NOT NULL,
  current_activity TEXT,
  current_step_number INTEGER,
  current_scenario_index INTEGER,
  current_scenario_title TEXT,
  summary TEXT NOT NULL,
  feature_area TEXT NOT NULL,
  environment TEXT NOT NULL,
  target_url TEXT NOT NULL,
  mode TEXT NOT NULL,
  role TEXT NOT NULL,
  scenario_library_id TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_details_phase ON run_details (current_phase);
CREATE INDEX IF NOT EXISTS idx_run_details_feature_area ON run_details (feature_area);
CREATE INDEX IF NOT EXISTS idx_run_details_mode_environment ON run_details (mode, environment);

CREATE TABLE IF NOT EXISTS run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  phase TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  step_number INTEGER,
  scenario_title TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_timestamp ON run_events (run_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_run_events_run_level ON run_events (run_id, level);

CREATE TABLE IF NOT EXISTS step_results (
  step_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  user_step_text TEXT NOT NULL,
  normalized_action TEXT NOT NULL,
  observed_target TEXT NOT NULL,
  action_result TEXT NOT NULL,
  assertion_result TEXT NOT NULL,
  notes TEXT NOT NULL,
  screenshot_label TEXT NOT NULL,
  screenshot_artifact_id TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_step_results_run_number ON step_results (run_id, step_number);
CREATE INDEX IF NOT EXISTS idx_step_results_run_assertion ON step_results (run_id, assertion_result);