/**
 * Database service for locker events
 * Uses Cloudflare D1 or KV for storage
 */

import type { LockerEvent, LockerStatus } from "./types";

export interface Database {
	createEvent(event: Omit<LockerEvent, "id" | "timestamp">): Promise<LockerEvent>;
	getEvents(lockerId: string, limit?: number): Promise<LockerEvent[]>;
	getLockerStatus(lockerId: string): Promise<LockerStatus | null>;
	updateLockerStatus(status: LockerStatus): Promise<void>;
}

/**
 * D1 Database implementation
 * Note: The db parameter should be a D1 database instance from Cloudflare Workers
 */
export class D1Database implements Database {
	constructor(private db: any) {}

	async createEvent(
		event: Omit<LockerEvent, "id" | "timestamp">,
	): Promise<LockerEvent> {
		const id = crypto.randomUUID();
		const timestamp = new Date();

		await this.db
			.prepare(
				`
			INSERT INTO locker_events (
				id, locker_id, action, result, timestamp,
				booking_id, user_id, admin_override, fallback_method,
				error_message, retry_count
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			)
			.bind(
				id,
				event.locker_id,
				event.action,
				event.result,
				timestamp.toISOString(),
				event.booking_id || null,
				event.user_id || null,
				event.admin_override ? 1 : 0,
				event.fallback_method || null,
				event.error_message || null,
				event.retry_count || 0,
			)
			.run();

		return {
			...event,
			id,
			timestamp,
		};
	}

	async getEvents(lockerId: string, limit = 100): Promise<LockerEvent[]> {
		const result = await this.db
			.prepare(
				`
			SELECT * FROM locker_events
			WHERE locker_id = ?
			ORDER BY timestamp DESC
			LIMIT ?
		`,
			)
			.bind(lockerId, limit)
			.all<LockerEvent>();

		return result.results.map((row) => ({
			...row,
			timestamp: new Date(row.timestamp),
			admin_override: Boolean(row.admin_override),
		}));
	}

	async getLockerStatus(lockerId: string): Promise<LockerStatus | null> {
		// Get latest event to determine status
		const events = await this.getEvents(lockerId, 1);
		if (events.length === 0) {
			return null;
		}

		const latestEvent = events[0];
		const is_open = latestEvent.action === "open" && latestEvent.result === "success";

		return {
			locker_id: lockerId,
			is_open,
			is_available: !is_open && latestEvent.result !== "hardware_error",
			last_action: latestEvent.action,
			last_action_time: latestEvent.timestamp,
			hardware_status:
				latestEvent.result === "hardware_error" ? "error" : "online",
			booking_id: latestEvent.booking_id,
		};
	}

	async updateLockerStatus(status: LockerStatus): Promise<void> {
		// Status is derived from events, so this is a no-op
		// In a real implementation, you might maintain a status cache table
	}
}

/**
 * SQL schema for locker_events table
 * Run this migration to create the table:
 */
export const LOCKER_EVENTS_SCHEMA = `
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
`;
