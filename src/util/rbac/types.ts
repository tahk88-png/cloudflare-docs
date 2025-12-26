/**
 * Role-Based Access Control (RBAC) Type Definitions
 * 
 * This module defines the core types for the RBAC system.
 * Follows least privilege principle - roles only have necessary permissions.
 */

export type Permission =
	| "view_bookings"
	| "modify_bookings"
	| "open_lockers"
	| "manage_incidents"
	| "view_payments";

export type Role = "admin" | "operator" | "technician";

export interface RoleDefinition {
	role: Role;
	permissions: Permission[];
	description: string;
}

export interface User {
	id: string;
	email: string;
	role: Role;
	createdAt: Date;
	updatedAt: Date;
}

export interface AuditLog {
	id: string;
	userId: string;
	action: "role_assigned" | "role_removed" | "role_changed";
	previousRole?: Role;
	newRole: Role;
	changedBy: string;
	timestamp: Date;
	metadata?: Record<string, unknown>;
}

export interface PermissionCheckResult {
	hasPermission: boolean;
	userRole: Role;
	requiredPermission: Permission;
}
