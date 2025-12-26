/**
 * Role Definitions
 * 
 * Defines the default roles and their permissions following least privilege principle.
 * 
 * Roles:
 * - Admin: Full access to all features
 * - Operator: Can manage bookings and incidents, view payments
 * - Technician: Can view bookings, open lockers, and manage incidents
 */

import type { RoleDefinition } from "./types";

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
	admin: {
		role: "admin",
		permissions: [
			"view_bookings",
			"modify_bookings",
			"open_lockers",
			"manage_incidents",
			"view_payments",
		],
		description: "Full administrative access to all features",
	},
	operator: {
		role: "operator",
		permissions: [
			"view_bookings",
			"modify_bookings",
			"manage_incidents",
			"view_payments",
		],
		description: "Can manage bookings and incidents, view payments",
	},
	technician: {
		role: "technician",
		permissions: [
			"view_bookings",
			"open_lockers",
			"manage_incidents",
		],
		description: "Can view bookings, open lockers, and manage incidents",
	},
};

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: string): string[] {
	return ROLE_DEFINITIONS[role]?.permissions || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
	role: string,
	permission: string,
): boolean {
	return getRolePermissions(role).includes(permission);
}

/**
 * Get all available roles
 */
export function getAllRoles(): RoleDefinition[] {
	return Object.values(ROLE_DEFINITIONS);
}
