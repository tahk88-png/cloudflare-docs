/**
 * GET /api/admin/incidents/[id]
 * Get a specific incident with full audit trail (admin-only)
 * PUT /api/admin/incidents/[id]
 * Update an incident (admin-only)
 */

import type { APIRoute } from "astro";
import { IncidentDB } from "../../../lib/incidents/db";
import { isAdmin } from "../../../lib/incidents/auth";
import {
	validateUpdateIncidentRequest,
	type UpdateIncidentRequest,
} from "../../../lib/incidents/validation";
import { getUserId } from "../../../lib/incidents/auth";
import { getDatabase, getRuntimeEnv } from "../../../lib/incidents/runtime";

export const GET: APIRoute = async ({ params, request, locals }) => {
	try {
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

		const id = params.id;
		if (!id) {
			return new Response(
				JSON.stringify({
					error: "Incident ID is required",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const incidentDB = new IncidentDB(db);
		const result = await incidentDB.getIncidentWithAudit(id);

		if (!result) {
			return new Response(
				JSON.stringify({
					error: "Incident not found",
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(
			JSON.stringify({
				...result.incident,
				audit_log: result.audit_log,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error getting incident:", error);
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

export const PUT: APIRoute = async ({ params, request, locals }) => {
	try {
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

		const id = params.id;
		if (!id) {
			return new Response(
				JSON.stringify({
					error: "Incident ID is required",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Parse request body
		const body = await request.json().catch(() => ({}));

		// Validate request
		const validation = validateUpdateIncidentRequest(body);
		if (!validation.valid) {
			return new Response(
				JSON.stringify({
					error: "Validation failed",
					details: validation.errors,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Update incident
		const incidentDB = new IncidentDB(db);
		const userId = getUserId(request);
		const updated = await incidentDB.updateIncident(
			id,
			body as UpdateIncidentRequest,
			userId,
		);

		if (!updated) {
			return new Response(
				JSON.stringify({
					error: "Incident not found",
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(JSON.stringify(updated), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error updating incident:", error);
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
