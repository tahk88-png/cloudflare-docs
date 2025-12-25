// GET /api/senders/:id - Get sender profile
// PUT /api/senders/:id - Update sender profile
// DELETE /api/senders/:id - Delete sender profile

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import type { SenderProfile } from "~/lib/db/types";

export const GET: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const { params } = context;
		const id = parseInt(params.id || "0");

		if (!id) {
			return new Response(JSON.stringify({ error: "Invalid sender ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const stmt = db.prepare("SELECT * FROM sender_profiles WHERE id = ?");
		const sender = await stmt.bind(id).first<SenderProfile>();

		if (!sender) {
			return new Response(JSON.stringify({ error: "Sender not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ sender }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching sender:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch sender" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const PUT: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const { params, request } = context;
		const id = parseInt(params.id || "0");
		const body = await request.json();

		if (!id) {
			return new Response(JSON.stringify({ error: "Invalid sender ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { name, email, reply_to, is_default } = body;

		// Validate email if provided
		if (email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return new Response(
					JSON.stringify({ error: "Invalid email format" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}
		}

		// If this is set as default, unset other defaults
		if (is_default) {
			const unsetStmt = db.prepare(
				"UPDATE sender_profiles SET is_default = 0 WHERE is_default = 1 AND id != ?",
			);
			await unsetStmt.bind(id).run();
		}

		const updateFields: string[] = [];
		const updateValues: unknown[] = [];

		if (name !== undefined) {
			updateFields.push("name = ?");
			updateValues.push(name);
		}
		if (email !== undefined) {
			updateFields.push("email = ?");
			updateValues.push(email);
		}
		if (reply_to !== undefined) {
			updateFields.push("reply_to = ?");
			updateValues.push(reply_to);
		}
		if (is_default !== undefined) {
			updateFields.push("is_default = ?");
			updateValues.push(is_default ? 1 : 0);
		}

		if (updateFields.length > 0) {
			updateFields.push("updated_at = CURRENT_TIMESTAMP");
			updateValues.push(id);

			const updateStmt = db.prepare(
				`UPDATE sender_profiles SET ${updateFields.join(", ")} WHERE id = ?`,
			);
			await updateStmt.bind(...updateValues).run();
		}

		// Fetch updated sender
		const fetchStmt = db.prepare("SELECT * FROM sender_profiles WHERE id = ?");
		const sender = await fetchStmt.bind(id).first<SenderProfile>();

		return new Response(JSON.stringify({ sender }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error updating sender:", error);
		return new Response(
			JSON.stringify({ error: "Failed to update sender" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const DELETE: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const { params } = context;
		const id = parseInt(params.id || "0");

		if (!id) {
			return new Response(JSON.stringify({ error: "Invalid sender ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const stmt = db.prepare("DELETE FROM sender_profiles WHERE id = ?");
		await stmt.bind(id).run();

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error deleting sender:", error);
		return new Response(
			JSON.stringify({ error: "Failed to delete sender" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
