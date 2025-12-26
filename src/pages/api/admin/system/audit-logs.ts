// GET /api/admin/system/audit-logs - Admin endpoint to get audit logs
import type { APIRoute } from "astro";
import { AuditService } from "../../../lib/feature-flags/audit";

function isAuthorized(request: Request): boolean {
	const authHeader = request.headers.get("authorization");
	const userId = request.headers.get("x-user-id");

	// TODO: Implement proper authentication
	return authHeader?.startsWith("Bearer ") || !!userId;
}

export const GET: APIRoute = async ({ request, url, platform }) => {
	try {
		// Check authorization
		if (!isAuthorized(request)) {
			return new Response(
				JSON.stringify({ error: "Unauthorized" }),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		if (!platform?.env?.DB) {
			return new Response(
				JSON.stringify({ error: "Database not configured" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const limit = parseInt(url.searchParams.get("limit") || "100", 10);
		const offset = parseInt(url.searchParams.get("offset") || "0", 10);
		const entityType = url.searchParams.get("entity_type") || undefined;

		const auditService = new AuditService(platform.env.DB);
		const logs = await auditService.getLogs(limit, offset, entityType);

		return new Response(
			JSON.stringify({
				logs,
				pagination: {
					limit,
					offset,
					total: logs.length,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error fetching audit logs:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to fetch audit logs",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
