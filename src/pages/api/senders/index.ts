// GET /api/senders - List sender profiles
// POST /api/senders - Create sender profile

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import type { SenderProfile } from "~/lib/db/types";

export const GET: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);

		const stmt = db.prepare(
			"SELECT * FROM sender_profiles ORDER BY is_default DESC, created_at DESC",
		);
		const result = await stmt.all<SenderProfile>();

		return new Response(JSON.stringify({ senders: result.results || [] }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching senders:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch senders" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const POST: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const { request } = context;
		const body = await request.json();

		const { name, email, reply_to, is_default } = body;

		if (!name || !email) {
			return new Response(
				JSON.stringify({ error: "Name and email are required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return new Response(
				JSON.stringify({ error: "Invalid email format" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// If this is set as default, unset other defaults
		if (is_default) {
			const unsetStmt = db.prepare(
				"UPDATE sender_profiles SET is_default = 0 WHERE is_default = 1",
			);
			await unsetStmt.run();
		}

		const stmt = db.prepare(
			`INSERT INTO sender_profiles (name, email, reply_to, is_default)
			 VALUES (?, ?, ?, ?)`,
		);

		const result = await stmt
			.bind(name, email, reply_to || null, is_default ? 1 : 0)
			.run();

		// Fetch the created sender
		const fetchStmt = db.prepare("SELECT * FROM sender_profiles WHERE id = ?");
		const sender = await fetchStmt.bind(result.meta.last_row_id).first<SenderProfile>();

		return new Response(JSON.stringify({ sender }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error creating sender:", error);
		return new Response(
			JSON.stringify({ error: "Failed to create sender profile" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
