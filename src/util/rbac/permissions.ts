/**
 * RBAC Permission Utilities
 * 
 * Provides functions for checking permissions and managing access control.
 * No hardcoded permissions in UI - all checks go through these utilities.
 */

import type { Permission, Role, User, PermissionCheckResult } from "./types";
import { roleHasPermission, getRolePermissions } from "./roles";

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
	user: User | null,
	permission: Permission,
): PermissionCheckResult {
	if (!user) {
		return {
			hasPermission: false,
			userRole: "technician" as Role, // Default fallback
			requiredPermission: permission,
		};
	}

	const hasAccess = roleHasPermission(user.role, permission);

	return {
		hasPermission: hasAccess,
		userRole: user.role,
		requiredPermission: permission,
	};
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
	user: User | null,
	permissions: Permission[],
): boolean {
	if (!user) return false;
	return permissions.some((permission) => roleHasPermission(user.role, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
	user: User | null,
	permissions: Permission[],
): boolean {
	if (!user) return false;
	return permissions.every((permission) => roleHasPermission(user.role, permission));
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: User | null): Permission[] {
	if (!user) return [];
	return getRolePermissions(user.role) as Permission[];
}
