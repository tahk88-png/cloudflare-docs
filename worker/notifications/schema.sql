-- Notification Engine Database Schema
-- Run with: wrangler d1 execute rentbox-notifications --file=./worker/notifications/schema.sql

CREATE TABLE IF NOT EXISTS notification_logs (
	id TEXT PRIMARY KEY,
	event TEXT NOT NULL,
	channel TEXT NOT NULL,
	recipient TEXT NOT NULL,
	status TEXT NOT NULL,
	priority TEXT NOT NULL,
	booking_id TEXT,
	rental_id TEXT,
	attempts INTEGER NOT NULL DEFAULT 1,
	last_attempt_at TEXT NOT NULL,
	created_at TEXT NOT NULL,
	sent_at TEXT,
	delivered_at TEXT,
	error TEXT,
	metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_event ON notification_logs(event);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_booking_id ON notification_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_rental_id ON notification_logs(rental_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient);
