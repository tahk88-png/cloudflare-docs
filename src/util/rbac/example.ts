/**
 * RBAC Usage Examples
 * 
 * This file demonstrates how to use the RBAC system in your application.
 * These are examples only - not meant to be executed directly.
 */

import type { Request } from "astro";
import {
	getCurrentUser,
	requireAuth,
} from "./auth";
import {
	hasPermission,
	hasAllPermissions,
	hasAnyPermission,
	getUserPermissions,
} from "./permissions";
import {
	requirePermission,
	requireAllPermissions,
	requireAnyPermission,
	requireAdmin,
} from "./middleware";
import { storage } from "./storage";

// Example 1: Check if user has permission
export async function exampleCheckPermission(request: Request) {
	const user = await getCurrentUser(request);
	
	if (!user) {
		return { error: "Not authenticated" };
	}

	const check = hasPermission(user, "modify_bookings");
	
	if (check.hasPermission) {
		// User can modify bookings
		return { allowed: true };
	}
	
	return { allowed: false, reason: "Missing permission" };
}

// Example 2: Protect an API route with permission check
export async function exampleProtectedRoute(request: Request) {
	try {
		// Require authentication
		const user = await requireAuth(request);
		
		// Check permission
		const check = hasPermission(user, "view_bookings");
		
		if (!check.hasPermission) {
			return new Response(
				JSON.stringify({ error: "Permission denied" }),
				{ status: 403 }
			);
		}
		
		// User has permission, proceed
		return new Response(
			JSON.stringify({ message: "Access granted" }),
			{ status: 200 }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Authentication required" }),
			{ status: 401 }
		);
	}
}

// Example 3: Use middleware for permission checking
export async function exampleWithMiddleware(request: Request) {
	try {
		// This will throw if user doesn't have permission
		const auth = await requirePermission("modify_bookings")(request);
		
		// User is authenticated and has permission
		const user = auth.user;
		
		// Your logic here
		return new Response(
			JSON.stringify({ message: "Booking modified", userId: user.id }),
			{ status: 200 }
		);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("Authentication required")) {
				return new Response(
					JSON.stringify({ error: "Authentication required" }),
					{ status: 401 }
				);
			}
			if (error.message.includes("Permission denied")) {
				return new Response(
					JSON.stringify({ error: "Permission denied" }),
					{ status: 403 }
				);
			}
		}
		
		return new Response(
			JSON.stringify({ error: "Internal server error" }),
			{ status: 500 }
		);
	}
}

// Example 4: Check multiple permissions
export async function exampleMultiplePermissions(request: Request) {
	const user = await getCurrentUser(request);
	
	if (!user) {
		return { error: "Not authenticated" };
	}

	// Check if user has ALL permissions
	const hasAll = hasAllPermissions(user, [
		"view_bookings",
		"modify_bookings",
	]);
	
	// Check if user has ANY permission
	const hasAny = hasAnyPermission(user, [
		"view_bookings",
		"open_lockers",
	]);
	
	return { hasAll, hasAny };
}

// Example 5: Get all user permissions
export async function exampleGetPermissions(request: Request) {
	const user = await getCurrentUser(request);
	
	if (!user) {
		return { error: "Not authenticated" };
	}

	const permissions = getUserPermissions(user);
	
	return {
		userId: user.id,
		role: user.role,
		permissions,
	};
}

// Example 6: Admin-only operation
export async function exampleAdminOnly(request: Request) {
	try {
		const auth = await requireAdmin()(request);
		const adminUser = auth.user;
		
		// Admin-only logic here
		// For example, get all users
		const allUsers = await storage.getAllUsers();
		
		return new Response(
			JSON.stringify({ users: allUsers }),
			{ status: 200 }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Admin access required" }),
			{ status: 403 }
		);
	}
}

// Example 7: Update user role (admin only)
export async function exampleUpdateRole(
	request: Request,
	userId: string,
	newRole: "admin" | "operator" | "technician",
) {
	try {
		const adminUser = await requireAuth(request);
		
		if (adminUser.role !== "admin") {
			return new Response(
				JSON.stringify({ error: "Admin access required" }),
				{ status: 403 }
			);
		}
		
		// Update role (audit log is automatically created)
		const updatedUser = await storage.updateUserRole(
			userId,
			newRole,
			adminUser.id,
		);
		
		return new Response(
			JSON.stringify({
				message: "Role updated",
				user: {
					id: updatedUser.id,
					email: updatedUser.email,
					role: updatedUser.role,
				},
			}),
			{ status: 200 }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to update role" }),
			{ status: 500 }
		);
	}
}
