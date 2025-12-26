-- Migration: Create locker_events table
-- Run with: wrangler d1 execute <DATABASE_NAME> --file=./migrations/001_create_locker_events.sql

CREATE TABLE IF NOT EXISTS locker_events (
	id TEXT PRIMARY KEY,
	locker_id TEXT NOT NULL,
	action TEXT NOT NULL,
	result TEXT NOT NULL,
	timestamp TEXT NOT NULL,
	booking_id TEXT,
	user_id TEXT,
	admin_override INTEGER DEFAULT 0,
	fallback_method TEXT,
	error_message TEXT,
	retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_locker_events_locker_id ON locker_events(locker_id);
CREATE INDEX IF NOT EXISTS idx_locker_events_timestamp ON locker_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_locker_events_booking_id ON locker_events(booking_id);
