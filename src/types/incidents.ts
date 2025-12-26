/**
 * Incident Management Types
 * Purpose: Track real-world problems. Replace memory with facts.
 */

export type IncidentType =
	| "locker_not_open"
	| "payment_access_failed"
	| "tool_damaged"
	| "missing_return";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "open" | "investigating" | "resolved";

export type AuditAction =
	| "created"
	| "updated"
	| "status_changed"
	| "severity_changed"
	| "resolved";

export interface Incident {
	id: string;
	type: IncidentType;
	severity: IncidentSeverity;
	status: IncidentStatus;
	booking_id?: string;
	locker_id?: string;
	description: string;
	resolution_notes?: string;
	created_by: string;
	created_at: number;
	updated_at: number;
	resolved_at?: number;
}

export interface IncidentAuditLog {
	id: number;
	incident_id: string;
	action: AuditAction;
	changed_by: string;
	old_value?: string;
	new_value?: string;
	notes?: string;
	created_at: number;
}

export interface CreateIncidentRequest {
	type: IncidentType;
	severity: IncidentSeverity;
	booking_id?: string;
	locker_id?: string;
	description: string;
	created_by?: string; // Optional for auto-creation
}

export interface UpdateIncidentRequest {
	status?: IncidentStatus;
	severity?: IncidentSeverity;
	resolution_notes?: string;
}

export interface IncidentResponse extends Incident {
	audit_log?: IncidentAuditLog[];
}

export interface IncidentsListResponse {
	incidents: Incident[];
	total: number;
	page?: number;
	limit?: number;
}
