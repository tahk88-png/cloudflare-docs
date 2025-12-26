/**
 * Database operations for notification logs
 * Uses D1 database
 */

import type { NotificationLog, NotificationStatus } from "./types.js";

export interface NotificationLogRow {
	id: string;
	event: string;
	channel: string;
	recipient: string;
	status: string;
	priority: string;
	booking_id?: string;
	rental_id?: string;
	attempts: number;
	last_attempt_at: string;
	created_at: string;
	sent_at?: string;
	delivered_at?: string;
	error?: string;
	metadata?: string;
}

/**
 * Initialize database schema
 */
export async function initDatabase(db: D1Database): Promise<void> {
	await db.exec(`
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
	`);
}

/**
 * Create a notification log entry
 */
export async function createLog(
	db: D1Database,
	log: Omit<NotificationLog, "id">,
): Promise<string> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	await db
		.prepare(
			`
			INSERT INTO notification_logs (
				id, event, channel, recipient, status, priority,
				booking_id, rental_id, attempts, last_attempt_at,
				created_at, sent_at, delivered_at, error, metadata
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		)
		.bind(
			id,
			log.event,
			log.channel,
			log.recipient,
			log.status,
			log.priority,
			log.bookingId || null,
			log.rentalId || null,
			log.attempts,
			log.lastAttemptAt,
			log.createdAt,
			log.sentAt || null,
			log.deliveredAt || null,
			log.error || null,
			log.metadata ? JSON.stringify(log.metadata) : null,
		)
		.run();

	return id;
}

/**
 * Update notification log status
 */
export async function updateLogStatus(
	db: D1Database,
	id: string,
	status: NotificationStatus,
	error?: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const updates: string[] = [];
	const values: unknown[] = [];

	updates.push("status = ?");
	values.push(status);

	updates.push("last_attempt_at = ?");
	values.push(new Date().toISOString());

	if (status === "sent") {
		updates.push("sent_at = ?");
		values.push(new Date().toISOString());
	}

	if (status === "delivered") {
		updates.push("delivered_at = ?");
		values.push(new Date().toISOString());
	}

	if (error !== undefined) {
		updates.push("error = ?");
		values.push(error);
	}

	if (metadata !== undefined) {
		updates.push("metadata = ?");
		values.push(JSON.stringify(metadata));
	}

	values.push(id);

	await db
		.prepare(
			`UPDATE notification_logs SET ${updates.join(", ")} WHERE id = ?`,
		)
		.bind(...values)
		.run();
}

/**
 * Increment retry attempts
 */
export async function incrementAttempts(
	db: D1Database,
	id: string,
): Promise<void> {
	await db
		.prepare(
			`UPDATE notification_logs SET attempts = attempts + 1, last_attempt_at = ? WHERE id = ?`,
		)
		.bind(new Date().toISOString(), id)
		.run();
}

/**
 * Get notification logs with filters
 */
export async function getLogs(
	db: D1Database,
	options: {
		limit?: number;
		offset?: number;
		event?: string;
		status?: string;
		bookingId?: string;
		rentalId?: string;
		recipient?: string;
		startDate?: string;
		endDate?: string;
	} = {},
): Promise<NotificationLog[]> {
	const conditions: string[] = [];
	const values: unknown[] = [];

	if (options.event) {
		conditions.push("event = ?");
		values.push(options.event);
	}

	if (options.status) {
		conditions.push("status = ?");
		values.push(options.status);
	}

	if (options.bookingId) {
		conditions.push("booking_id = ?");
		values.push(options.bookingId);
	}

	if (options.rentalId) {
		conditions.push("rental_id = ?");
		values.push(options.rentalId);
	}

	if (options.recipient) {
		conditions.push("recipient = ?");
		values.push(options.recipient);
	}

	if (options.startDate) {
		conditions.push("created_at >= ?");
		values.push(options.startDate);
	}

	if (options.endDate) {
		conditions.push("created_at <= ?");
		values.push(options.endDate);
	}

	const whereClause =
		conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	const limit = options.limit || 100;
	const offset = options.offset || 0;

	const query = `
		SELECT * FROM notification_logs
		${whereClause}
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`;

	const result = await db
		.prepare(query)
		.bind(...values, limit, offset)
		.all<NotificationLogRow>();

	return result.results.map(rowToLog);
}

/**
 * Get a single notification log by ID
 */
export async function getLogById(
	db: D1Database,
	id: string,
): Promise<NotificationLog | null> {
	const result = await db
		.prepare("SELECT * FROM notification_logs WHERE id = ?")
		.bind(id)
		.first<NotificationLogRow>();

	return result ? rowToLog(result) : null;
}

/**
 * Convert database row to NotificationLog
 */
function rowToLog(row: NotificationLogRow): NotificationLog {
	return {
		id: row.id,
		event: row.event as NotificationLog["event"],
		channel: row.channel as NotificationLog["channel"],
		recipient: row.recipient,
		status: row.status as NotificationLog["status"],
		priority: row.priority as NotificationLog["priority"],
		bookingId: row.booking_id,
		rentalId: row.rental_id,
		attempts: row.attempts,
		lastAttemptAt: row.last_attempt_at,
		createdAt: row.created_at,
		sentAt: row.sent_at,
		deliveredAt: row.delivered_at,
		error: row.error,
		metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
	};
}
