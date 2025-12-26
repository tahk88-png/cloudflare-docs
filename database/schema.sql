-- Rentbox.ee Database Schema for Return Flow

-- Bookings table (assumes this exists, adding return-related columns)
-- If bookings table doesn't exist, create it:
CREATE TABLE IF NOT EXISTS bookings (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	tool_id TEXT NOT NULL,
	start_at TEXT NOT NULL, -- ISO 8601 date string
	end_at TEXT NOT NULL, -- ISO 8601 date string
	status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed, overdue, returned
	return_status TEXT, -- pending, confirmed, disputed, approved
	return_requested_at TEXT, -- ISO 8601 date string
	return_confirmed_at TEXT, -- ISO 8601 date string
	return_photos TEXT, -- JSON array of photo URLs/keys
	admin_notes TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_end_at ON bookings(end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_return_status ON bookings(return_status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Tools table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS tools (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	name TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Return reminders log (optional, for tracking sent reminders)
CREATE TABLE IF NOT EXISTS return_reminders (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	booking_id TEXT NOT NULL,
	sent_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE INDEX IF NOT EXISTS idx_return_reminders_booking_id ON return_reminders(booking_id);
