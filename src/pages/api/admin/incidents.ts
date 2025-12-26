/**
 * GET /api/admin/incidents
 * List incidents (admin-only access)
 */

import type { APIRoute } from "astro";
import { IncidentDB } from "../../lib/incidents/db";
import { isAdmin } from "../../lib/incidents/auth";
import { getDatabase, getRuntimeEnv } from "../../lib/incidents/runtime";

export const GET: APIRoute = async ({ request, locals, url }) => {
	try {
		// Get database and check admin authentication
		const db = getDatabase(locals);
		if (!db) {
			return new Response(
				JSON.stringify({
					error: "Database not configured",
					message: "INCIDENTS_DB binding not found. Ensure D1 database is configured in wrangler.toml",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const env = getRuntimeEnv(locals);
		if (!isAdmin(request, env || {})) {
			return new Response(
				JSON.stringify({
					error: "Unauthorized",
					message: "Admin access required",
				}),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Parse query parameters
		const searchParams = url.searchParams;
		const status = searchParams.get("status") || undefined;
		const severity = searchParams.get("severity") || undefined;
		const booking_id = searchParams.get("booking_id") || undefined;
		const locker_id = searchParams.get("locker_id") || undefined;
		const limit = parseInt(searchParams.get("limit") || "50", 10);
		const offset = parseInt(searchParams.get("offset") || "0", 10);
		const include_audit = searchParams.get("include_audit") === "true";

		// Validate limit
		if (limit < 1 || limit > 100) {
			return new Response(
				JSON.stringify({
					error: "Invalid limit",
					message: "Limit must be between 1 and 100",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Get incidents
		const incidentDB = new IncidentDB(db);
		const result = await incidentDB.listIncidents({
			status,
			severity,
			booking_id,
			locker_id,
			limit,
			offset,
		});

		// If audit trail requested, fetch for each incident
		if (include_audit) {
			const incidentsWithAudit = await Promise.all(
				result.incidents.map(async (incident) => {
					const withAudit = await incidentDB.getIncidentWithAudit(
						incident.id,
					);
					return {
						...incident,
						audit_log: withAudit?.audit_log || [],
					};
				}),
			);

			return new Response(
				JSON.stringify({
					incidents: incidentsWithAudit,
					total: result.total,
					page: Math.floor(offset / limit) + 1,
					limit,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(
			JSON.stringify({
				incidents: result.incidents,
				total: result.total,
				page: Math.floor(offset / limit) + 1,
				limit,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error listing incidents:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
