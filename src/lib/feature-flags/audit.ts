// Audit Logging Service
import type { AuditLog } from "./types";

export class AuditService {
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
	}

	async log(
		action: string,
		entityType: string,
		options: {
			entityId?: string;
			oldValue?: any;
			newValue?: any;
			userId?: string;
			userEmail?: string;
			reason?: string;
			ipAddress?: string;
			userAgent?: string;
		},
	): Promise<AuditLog> {
		const {
			entityId,
			oldValue,
			newValue,
			userId,
			userEmail,
			reason,
			ipAddress,
			userAgent,
		} = options;

		const result = await this.db
			.prepare(
				`INSERT INTO audit_logs 
        (action, entity_type, entity_id, old_value, new_value, user_id, user_email, reason, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *`,
			)
			.bind(
				action,
				entityType,
				entityId || null,
				oldValue ? JSON.stringify(oldValue) : null,
				newValue ? JSON.stringify(newValue) : null,
				userId || null,
				userEmail || null,
				reason || null,
				ipAddress || null,
				userAgent || null,
			)
			.first<AuditLog>();

		if (!result) {
			throw new Error("Failed to create audit log");
		}

		return result;
	}

	async getLogs(
		limit: number = 100,
		offset: number = 0,
		entityType?: string,
	): Promise<AuditLog[]> {
		let query = "SELECT * FROM audit_logs";
		const params: any[] = [];

		if (entityType) {
			query += " WHERE entity_type = ?";
			params.push(entityType);
		}

		query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
		params.push(limit, offset);

		const result = await this.db.prepare(query).bind(...params).all<AuditLog>();

		return result.results;
	}
}
