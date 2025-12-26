/**
 * Validation utilities for Incident Management
 */

import type {
	IncidentType,
	IncidentSeverity,
	CreateIncidentRequest,
	UpdateIncidentRequest,
} from "../../types/incidents";

const VALID_INCIDENT_TYPES: IncidentType[] = [
	"locker_not_open",
	"payment_access_failed",
	"tool_damaged",
	"missing_return",
];

const VALID_SEVERITIES: IncidentSeverity[] = [
	"low",
	"medium",
	"high",
	"critical",
];

const VALID_STATUSES = ["open", "investigating", "resolved"];

export function validateIncidentType(type: string): type is IncidentType {
	return VALID_INCIDENT_TYPES.includes(type as IncidentType);
}

export function validateSeverity(
	severity: string,
): severity is IncidentSeverity {
	return VALID_SEVERITIES.includes(severity as IncidentSeverity);
}

export function validateStatus(status: string): boolean {
	return VALID_STATUSES.includes(status);
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

export function validateCreateIncidentRequest(
	request: any,
): ValidationResult {
	const errors: string[] = [];

	if (!request.type || typeof request.type !== "string") {
		errors.push("type is required and must be a string");
	} else if (!validateIncidentType(request.type)) {
		errors.push(
			`type must be one of: ${VALID_INCIDENT_TYPES.join(", ")}`,
		);
	}

	if (!request.severity || typeof request.severity !== "string") {
		errors.push("severity is required and must be a string");
	} else if (!validateSeverity(request.severity)) {
		errors.push(
			`severity must be one of: ${VALID_SEVERITIES.join(", ")}`,
		);
	}

	if (!request.description || typeof request.description !== "string") {
		errors.push("description is required and must be a string");
	} else if (request.description.trim().length === 0) {
		errors.push("description cannot be empty");
	} else if (request.description.length > 5000) {
		errors.push("description must be 5000 characters or less");
	}

	if (request.booking_id !== undefined && typeof request.booking_id !== "string") {
		errors.push("booking_id must be a string if provided");
	}

	if (request.locker_id !== undefined && typeof request.locker_id !== "string") {
		errors.push("locker_id must be a string if provided");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export function validateUpdateIncidentRequest(
	request: any,
): ValidationResult {
	const errors: string[] = [];

	if (request.status !== undefined) {
		if (typeof request.status !== "string") {
			errors.push("status must be a string");
		} else if (!validateStatus(request.status)) {
			errors.push(
				`status must be one of: ${VALID_STATUSES.join(", ")}`,
			);
		}
	}

	if (request.severity !== undefined) {
		if (typeof request.severity !== "string") {
			errors.push("severity must be a string");
		} else if (!validateSeverity(request.severity)) {
			errors.push(
				`severity must be one of: ${VALID_SEVERITIES.join(", ")}`,
			);
		}
	}

	if (request.resolution_notes !== undefined) {
		if (typeof request.resolution_notes !== "string") {
			errors.push("resolution_notes must be a string");
		} else if (request.resolution_notes.length > 10000) {
			errors.push("resolution_notes must be 10000 characters or less");
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
