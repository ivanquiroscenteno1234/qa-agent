CREATE TABLE IF NOT EXISTS environment_libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_environment_libraries_updated_at ON environment_libraries (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_environment_libraries_name ON environment_libraries (name);

CREATE TABLE IF NOT EXISTS credential_libraries (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credential_libraries_updated_at ON credential_libraries (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_credential_libraries_label ON credential_libraries (label);
