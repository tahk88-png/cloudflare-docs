/**
 * POST /api/incidents
 * Create a new incident (auto or manual)
 */

import type { APIRoute } from "astro";
import { IncidentDB } from "../../lib/incidents/db";
import {
	validateCreateIncidentRequest,
	type CreateIncidentRequest,
} from "../../lib/incidents/validation";
import { getUserId } from "../../lib/incidents/auth";
import { getDatabase } from "../../lib/incidents/runtime";

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Get D1 database from runtime
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

		// Parse request body
		const body = await request.json().catch(() => ({}));

		// Validate request
		const validation = validateCreateIncidentRequest(body);
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

		// Get user ID (for manual creation) or use system (for auto-creation)
		const userId = body.created_by || getUserId(request);

		// Create incident
		const incidentDB = new IncidentDB(db);
		const incident = await incidentDB.createIncident(
			body as CreateIncidentRequest,
			userId,
		);

		return new Response(JSON.stringify(incident), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error creating incident:", error);
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
