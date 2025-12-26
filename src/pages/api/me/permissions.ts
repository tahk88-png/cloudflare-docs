/**
 * GET /api/me/permissions
 * 
 * Returns the current user's permissions.
 * No hardcoded permissions - all permissions come from the user's role.
 */

import type { APIRoute } from "astro";
import { getCurrentUser } from "~/util/rbac/auth";
import { getUserPermissions } from "~/util/rbac/permissions";

export const GET: APIRoute = async ({ request }) => {
	try {
		const user = await getCurrentUser(request);

		if (!user) {
			return new Response(
				JSON.stringify({ error: "Authentication required" }),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const permissions = getUserPermissions(user);

		return new Response(
			JSON.stringify({
				userId: user.id,
				email: user.email,
				role: user.role,
				permissions,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
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
