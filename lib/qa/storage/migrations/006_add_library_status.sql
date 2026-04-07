ALTER TABLE scenario_libraries ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_scenario_libraries_status ON scenario_libraries (status);
