/**
 * GET /api/admin/roles
 * 
 * Returns all available roles and their permissions.
 * Requires admin role to access.
 */

import type { APIRoute } from "astro";
import { requireAuth } from "~/util/rbac/auth";
import { getAllRoles } from "~/util/rbac/roles";

export const GET: APIRoute = async ({ request }) => {
	try {
		const user = await requireAuth(request);

		// Check if user has admin role
		const isAdmin = user.role === "admin";

		if (!isAdmin) {
			return new Response(
				JSON.stringify({ error: "Admin access required" }),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const roles = getAllRoles();

		return new Response(
			JSON.stringify({
				roles: roles.map((role) => ({
					role: role.role,
					permissions: role.permissions,
					description: role.description,
				})),
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
