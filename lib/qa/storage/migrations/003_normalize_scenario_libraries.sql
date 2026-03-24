CREATE TABLE IF NOT EXISTS scenario_library_details (
  library_id TEXT PRIMARY KEY,
  source_run_id TEXT,
  feature_area TEXT NOT NULL,
  environment TEXT NOT NULL,
  target_url TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  risk_summary_json TEXT NOT NULL,
  coverage_gaps_json TEXT NOT NULL,
  FOREIGN KEY (library_id) REFERENCES scenario_libraries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenario_library_details_feature_area ON scenario_library_details (feature_area);
CREATE INDEX IF NOT EXISTS idx_scenario_library_details_environment ON scenario_library_details (environment);

CREATE TABLE IF NOT EXISTS scenario_library_versions (
  library_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  source_run_id TEXT,
  scenario_count INTEGER NOT NULL,
  summary TEXT NOT NULL,
  change_summary_json TEXT NOT NULL,
  PRIMARY KEY (library_id, version),
  FOREIGN KEY (library_id) REFERENCES scenario_libraries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenario_library_versions_library_created ON scenario_library_versions (library_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scenario_library_scenarios (
  scenario_id TEXT PRIMARY KEY,
  library_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL,
  type TEXT NOT NULL,
  prerequisites_json TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  risk_rationale TEXT NOT NULL,
  approved_for_automation INTEGER NOT NULL,
  FOREIGN KEY (library_id) REFERENCES scenario_libraries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenario_library_scenarios_library_ordinal ON scenario_library_scenarios (library_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_scenario_library_scenarios_library_title ON scenario_library_scenarios (library_id, title);