-- Terms versions table
CREATE TABLE IF NOT EXISTS terms_versions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_terms_versions_active ON terms_versions(is_active);
