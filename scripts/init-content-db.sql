-- Content Creation System Database Schema
-- Run with: wrangler d1 execute CONTENT_DB --file=scripts/init-content-db.sql

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'et',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document blocks table
CREATE TABLE IF NOT EXISTS document_blocks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_blocks_document_id ON document_blocks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_blocks_order ON document_blocks(document_id, "order");

-- Media assets table
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(type);

-- Document versions table (for version history)
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(document_id, created_at DESC);

-- AI edit logs table
CREATE TABLE IF NOT EXISTS ai_edit_logs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  block_id TEXT,
  action TEXT NOT NULL,
  tone TEXT,
  language TEXT NOT NULL,
  original_text TEXT NOT NULL,
  improved_text TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_edit_logs_document_id ON ai_edit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_edit_logs_block_id ON ai_edit_logs(block_id);
CREATE INDEX IF NOT EXISTS idx_ai_edit_logs_created_at ON ai_edit_logs(document_id, created_at DESC);
