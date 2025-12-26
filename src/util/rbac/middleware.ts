/**
 * RBAC Authorization Middleware
 * 
 * Provides middleware functions for protecting routes based on permissions.
 * Follows least privilege principle - only grants access to necessary permissions.
 */

import type { Permission, User } from "./types";
import { getCurrentUser } from "./auth";
import { hasPermission } from "./permissions";

export interface AuthorizationContext {
	user: User;
	hasPermission: boolean;
}

/**
 * Create authorization middleware for a specific permission
 */
export function requirePermission(permission: Permission) {
	return async (request: Request): Promise<AuthorizationContext> => {
		const user = await getCurrentUser(request);

		if (!user) {
			throw new Error("Authentication required");
		}

		const check = hasPermission(user, permission);

		if (!check.hasPermission) {
			throw new Error(`Permission denied: ${permission} required`);
		}

		return {
			user,
			hasPermission: true,
		};
	};
}

/**
 * Create authorization middleware for multiple permissions (requires all)
 */
export function requireAllPermissions(permissions: Permission[]) {
	return async (request: Request): Promise<AuthorizationContext> => {
		const user = await getCurrentUser(request);

		if (!user) {
			throw new Error("Authentication required");
		}

		for (const permission of permissions) {
			const check = hasPermission(user, permission);
			if (!check.hasPermission) {
				throw new Error(`Permission denied: ${permission} required`);
			}
		}

		return {
			user,
			hasPermission: true,
		};
	};
}

/**
 * Create authorization middleware for multiple permissions (requires any)
 */
export function requireAnyPermission(permissions: Permission[]) {
	return async (request: Request): Promise<AuthorizationContext> => {
		const user = await getCurrentUser(request);

		if (!user) {
			throw new Error("Authentication required");
		}

		for (const permission of permissions) {
			const check = hasPermission(user, permission);
			if (check.hasPermission) {
				return {
					user,
					hasPermission: true,
				};
			}
		}

		throw new Error(
			`Permission denied: one of [${permissions.join(", ")}] required`,
		);
	};
}

/**
 * Require admin role
 */
export function requireAdmin() {
	return async (request: Request): Promise<AuthorizationContext> => {
		const user = await getCurrentUser(request);

		if (!user) {
			throw new Error("Authentication required");
		}

		if (user.role !== "admin") {
			throw new Error("Admin role required");
		}

		return {
			user,
			hasPermission: true,
		};
	};
}
