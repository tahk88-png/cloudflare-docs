/**
 * Database operations for Incident Management
 */

/// <reference types="@cloudflare/workers-types" />

import type {
	Incident,
	IncidentAuditLog,
	CreateIncidentRequest,
	UpdateIncidentRequest,
} from "../../types/incidents";

export class IncidentDB {
	constructor(private db: D1Database) {}

	/**
	 * Create a new incident
	 */
	async createIncident(
		request: CreateIncidentRequest,
		createdBy: string,
	): Promise<Incident> {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		const incident: Incident = {
			id,
			type: request.type,
			severity: request.severity,
			status: "open",
			booking_id: request.booking_id,
			locker_id: request.locker_id,
			description: request.description,
			created_by: createdBy,
			created_at: now,
			updated_at: now,
		};

		await this.db
			.prepare(
				`INSERT INTO incidents (
          id, type, severity, status, booking_id, locker_id, 
          description, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				incident.id,
				incident.type,
				incident.severity,
				incident.status,
				incident.booking_id || null,
				incident.locker_id || null,
				incident.description,
				incident.created_by,
				incident.created_at,
				incident.updated_at,
			)
			.run();

		// Create audit log entry
		await this.createAuditLog({
			incident_id: id,
			action: "created",
			changed_by: createdBy,
			new_value: JSON.stringify(incident),
			notes: `Incident created: ${request.type}`,
		});

		return incident;
	}

	/**
	 * Get incident by ID
	 */
	async getIncident(id: string): Promise<Incident | null> {
		const result = await this.db
			.prepare("SELECT * FROM incidents WHERE id = ?")
			.bind(id)
			.first<Incident>();

		return result || null;
	}

	/**
	 * Get incident with full audit trail
	 */
	async getIncidentWithAudit(id: string): Promise<{
		incident: Incident;
		audit_log: IncidentAuditLog[];
	} | null> {
		const incident = await this.getIncident(id);
		if (!incident) {
			return null;
		}

		const auditLogs = await this.db
			.prepare(
				"SELECT * FROM incident_audit_log WHERE incident_id = ? ORDER BY created_at ASC",
			)
			.bind(id)
			.all<IncidentAuditLog>();

		return {
			incident,
			audit_log: auditLogs.results || [],
		};
	}

	/**
	 * List incidents with filters
	 */
	async listIncidents(options: {
		status?: string;
		severity?: string;
		booking_id?: string;
		locker_id?: string;
		limit?: number;
		offset?: number;
	}): Promise<{ incidents: Incident[]; total: number }> {
		const conditions: string[] = [];
		const bindings: any[] = [];

		if (options.status) {
			conditions.push("status = ?");
			bindings.push(options.status);
		}
		if (options.severity) {
			conditions.push("severity = ?");
			bindings.push(options.severity);
		}
		if (options.booking_id) {
			conditions.push("booking_id = ?");
			bindings.push(options.booking_id);
		}
		if (options.locker_id) {
			conditions.push("locker_id = ?");
			bindings.push(options.locker_id);
		}

		const whereClause =
			conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

		// Get total count
		const countResult = await this.db
			.prepare(`SELECT COUNT(*) as total FROM incidents ${whereClause}`)
			.bind(...bindings)
			.first<{ total: number }>();

		const total = countResult?.total || 0;

		// Get incidents
		const limit = options.limit || 50;
		const offset = options.offset || 0;

		const incidentsResult = await this.db
			.prepare(
				`SELECT * FROM incidents ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
			)
			.bind(...bindings, limit, offset)
			.all<Incident>();

		return {
			incidents: incidentsResult.results || [],
			total,
		};
	}

	/**
	 * Update incident
	 */
	async updateIncident(
		id: string,
		updates: UpdateIncidentRequest,
		updatedBy: string,
	): Promise<Incident | null> {
		const existing = await this.getIncident(id);
		if (!existing) {
			return null;
		}

		const now = Math.floor(Date.now() / 1000);
		const updatesList: string[] = [];
		const bindings: any[] = [];

		// Track changes for audit log
		const changes: Array<{ field: string; old: any; new: any }> = [];

		if (updates.status !== undefined && updates.status !== existing.status) {
			updatesList.push("status = ?");
			bindings.push(updates.status);
			changes.push({
				field: "status",
				old: existing.status,
				new: updates.status,
			});
		}

		if (
			updates.severity !== undefined &&
			updates.severity !== existing.severity
		) {
			updatesList.push("severity = ?");
			bindings.push(updates.severity);
			changes.push({
				field: "severity",
				old: existing.severity,
				new: updates.severity,
			});
		}

		if (updates.resolution_notes !== undefined) {
			updatesList.push("resolution_notes = ?");
			bindings.push(updates.resolution_notes);
			changes.push({
				field: "resolution_notes",
				old: existing.resolution_notes,
				new: updates.resolution_notes,
			});
		}

		// If status changed to resolved, set resolved_at
		if (updates.status === "resolved" && existing.status !== "resolved") {
			updatesList.push("resolved_at = ?");
			bindings.push(now);
		}

		if (updatesList.length === 0) {
			return existing; // No changes
		}

		updatesList.push("updated_at = ?");
		bindings.push(now);
		bindings.push(id); // For WHERE clause

		await this.db
			.prepare(
				`UPDATE incidents SET ${updatesList.join(", ")} WHERE id = ?`,
			)
			.bind(...bindings)
			.run();

		// Create audit log entries for each change
		for (const change of changes) {
			const action =
				change.field === "status"
					? "status_changed"
					: change.field === "severity"
						? "severity_changed"
						: "updated";

			await this.createAuditLog({
				incident_id: id,
				action: action as any,
				changed_by: updatedBy,
				old_value: String(change.old || ""),
				new_value: String(change.new || ""),
				notes: `${change.field} changed from ${change.old} to ${change.new}`,
			});
		}

		// If resolved, create resolved audit entry
		if (updates.status === "resolved" && existing.status !== "resolved") {
			await this.createAuditLog({
				incident_id: id,
				action: "resolved",
				changed_by: updatedBy,
				notes: updates.resolution_notes || "Incident resolved",
			});
		}

		return await this.getIncident(id);
	}

	/**
	 * Create audit log entry
	 */
	private async createAuditLog(log: {
		incident_id: string;
		action: string;
		changed_by: string;
		old_value?: string;
		new_value?: string;
		notes?: string;
	}): Promise<void> {
		const now = Math.floor(Date.now() / 1000);

		await this.db
			.prepare(
				`INSERT INTO incident_audit_log (
          incident_id, action, changed_by, old_value, new_value, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				log.incident_id,
				log.action,
				log.changed_by,
				log.old_value || null,
				log.new_value || null,
				log.notes || null,
				now,
			)
			.run();
	}
}
