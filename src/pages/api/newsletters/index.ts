// GET /api/newsletters - List newsletters
// POST /api/newsletters - Create newsletter

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import type { Newsletter } from "~/lib/db/types";

export const GET: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const url = new URL(context.request.url);
		const status = url.searchParams.get("status") || "draft";

		const stmt = db.prepare(
			"SELECT * FROM newsletters WHERE status = ? ORDER BY created_at DESC LIMIT 50",
		);
		const result = await stmt.bind(status).all<Newsletter>();

		return new Response(JSON.stringify({ newsletters: result.results || [] }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching newsletters:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch newsletters" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const POST: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const body = await context.request.json();

		const { subject, preheader, sender_id } = body;

		// Validate subject
		const subjectValidation = validateSubject(subject || "");
		if (!subjectValidation.valid) {
			return new Response(
				JSON.stringify({ error: subjectValidation.error }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Validate preheader
		const preheaderValidation = validatePreheader(preheader || null);
		if (!preheaderValidation.valid) {
			return new Response(
				JSON.stringify({ error: preheaderValidation.error }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Create initial newsletter with empty body
		const stmt = db.prepare(
			`INSERT INTO newsletters (subject, preheader, body_html, body_text, sender_id, status)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		);

		const result = await stmt
			.bind(
				subject,
				preheader || null,
				"<p></p>", // Empty initial body
				"", // Empty initial text
				sender_id || null,
				"draft",
			)
			.run();

		// Fetch the created newsletter
		const fetchStmt = db.prepare("SELECT * FROM newsletters WHERE id = ?");
		const newsletter = await fetchStmt.bind(result.meta.last_row_id).first<Newsletter>();

		return new Response(JSON.stringify({ newsletter }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error creating newsletter:", error);
		return new Response(
			JSON.stringify({ error: "Failed to create newsletter" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
