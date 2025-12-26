/**
 * GET /api/admin/audit-logs
 * 
 * Returns audit logs for role changes. Requires admin access.
 */

import type { APIRoute } from "astro";
import { requireAuth } from "~/util/rbac/auth";
import { storage } from "~/util/rbac/storage";

export const GET: APIRoute = async ({ request, url }) => {
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

		// Optional: filter by userId
		const userId = url.searchParams.get("userId");
		const logs = await storage.getAuditLogs(userId || undefined);

		return new Response(
			JSON.stringify({
				logs: logs.map((log) => ({
					id: log.id,
					userId: log.userId,
					action: log.action,
					previousRole: log.previousRole,
					newRole: log.newRole,
					changedBy: log.changedBy,
					timestamp: log.timestamp.toISOString(),
					metadata: log.metadata,
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
