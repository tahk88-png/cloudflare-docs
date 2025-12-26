/**
 * PUT /api/admin/users/[userId]/role
 * 
 * Updates a user's role. Requires admin access.
 * All role changes are automatically logged in the audit log.
 */

import type { APIRoute } from "astro";
import { requireAuth } from "~/util/rbac/auth";
import { storage } from "~/util/rbac/storage";
import type { Role } from "~/util/rbac/types";

export const PUT: APIRoute = async ({ params, request }) => {
	try {
		const adminUser = await requireAuth(request);

		// Check if user is admin
		if (adminUser.role !== "admin") {
			return new Response(
				JSON.stringify({ error: "Admin access required" }),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const userId = params.userId;
		if (!userId) {
			return new Response(
				JSON.stringify({ error: "User ID required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const body = await request.json();
		const { role } = body as { role: Role };

		if (!role || !["admin", "operator", "technician"].includes(role)) {
			return new Response(
				JSON.stringify({ error: "Invalid role" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Update user role (audit log is automatically created in storage)
		const updatedUser = await storage.updateUserRole(
			userId,
			role,
			adminUser.id,
		);

		return new Response(
			JSON.stringify({
				user: {
					id: updatedUser.id,
					email: updatedUser.email,
					role: updatedUser.role,
				},
				message: "Role updated successfully",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		if (error instanceof Error && error.message === "Authentication required") {
			return new Response(
				JSON.stringify({ error: "Authentication required" }),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		if (error instanceof Error && error.message.includes("not found")) {
			return new Response(
				JSON.stringify({ error: error.message }),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(
			JSON.stringify({
				error: "Internal server error",
				message: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
