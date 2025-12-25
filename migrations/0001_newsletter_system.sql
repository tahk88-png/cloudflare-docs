-- Newsletter Creation System Database Schema
-- For Cloudflare D1

-- Sender profiles table
CREATE TABLE IF NOT EXISTS sender_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    reply_to TEXT,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email)
);

-- Newsletters table
CREATE TABLE IF NOT EXISTS newsletters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    preheader TEXT,
    body_html TEXT NOT NULL,
    body_text TEXT,
    sender_id INTEGER,
    status TEXT DEFAULT 'draft', -- draft, scheduled, sent
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES sender_profiles(id)
);

-- Newsletter blocks (for block-based editor)
CREATE TABLE IF NOT EXISTS newsletter_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    newsletter_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- heading, paragraph, list, image, link
    content TEXT NOT NULL, -- JSON content
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE
);

-- Newsletter images (image library)
CREATE TABLE IF NOT EXISTS newsletter_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter versions (for versioning/undo)
CREATE TABLE IF NOT EXISTS newsletter_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    newsletter_id INTEGER NOT NULL,
    content_snapshot TEXT NOT NULL, -- JSON snapshot
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE
);

-- AI improvement logs
CREATE TABLE IF NOT EXISTS newsletter_ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    newsletter_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- improve-clarity, shorten, make-persuasive, etc.
    tone TEXT,
    original_text TEXT,
    improved_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletters_sender ON newsletters(sender_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_blocks_newsletter ON newsletter_blocks(newsletter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_versions_newsletter ON newsletter_versions(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_newsletter ON newsletter_ai_logs(newsletter_id);
