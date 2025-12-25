// GET /api/newsletters/:id - Get newsletter
// PUT /api/newsletters/:id - Update newsletter
// DELETE /api/newsletters/:id - Delete newsletter

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import type { Newsletter, NewsletterBlock } from "~/lib/db/types";

export const GET: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const { params } = context;
		const id = parseInt(params.id || "0");

		if (!id) {
			return new Response(JSON.stringify({ error: "Invalid newsletter ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Fetch newsletter
		const newsletterStmt = db.prepare("SELECT * FROM newsletters WHERE id = ?");
		const newsletter = await newsletterStmt.bind(id).first<Newsletter>();

		if (!newsletter) {
			return new Response(JSON.stringify({ error: "Newsletter not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Fetch blocks
		const blocksStmt = db.prepare(
			"SELECT * FROM newsletter_blocks WHERE newsletter_id = ? ORDER BY order_index",
		);
		const blocksResult = await blocksStmt.bind(id).all<NewsletterBlock>();

		return new Response(
			JSON.stringify({
				newsletter,
				blocks: blocksResult.results || [],
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error fetching newsletter:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch newsletter" }),
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
			return new Response(JSON.stringify({ error: "Invalid newsletter ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { subject, preheader, body_html, body_text, sender_id, status, blocks } =
			body;

		// Update newsletter
		const updateFields: string[] = [];
		const updateValues: unknown[] = [];

		if (subject !== undefined) {
			updateFields.push("subject = ?");
			updateValues.push(subject);
		}
		if (preheader !== undefined) {
			updateFields.push("preheader = ?");
			updateValues.push(preheader);
		}
		if (body_html !== undefined) {
			updateFields.push("body_html = ?");
			updateValues.push(body_html);
		}
		if (body_text !== undefined) {
			updateFields.push("body_text = ?");
			updateValues.push(body_text);
		}
		if (sender_id !== undefined) {
			updateFields.push("sender_id = ?");
			updateValues.push(sender_id);
		}
		if (status !== undefined) {
			updateFields.push("status = ?");
			updateValues.push(status);
		}

		if (updateFields.length > 0) {
			updateFields.push("updated_at = CURRENT_TIMESTAMP");
			updateValues.push(id);

			const updateStmt = db.prepare(
				`UPDATE newsletters SET ${updateFields.join(", ")} WHERE id = ?`,
			);
			await updateStmt.bind(...updateValues).run();
		}

		// Update blocks if provided
		if (blocks && Array.isArray(blocks)) {
			// Delete existing blocks
			const deleteStmt = db.prepare(
				"DELETE FROM newsletter_blocks WHERE newsletter_id = ?",
			);
			await deleteStmt.bind(id).run();

			// Insert new blocks
			if (blocks.length > 0) {
				const insertStmt = db.prepare(
					`INSERT INTO newsletter_blocks (newsletter_id, type, content, order_index)
					 VALUES (?, ?, ?, ?)`,
				);

				await db.batch(
					blocks.map((block: NewsletterBlock, index: number) =>
						insertStmt.bind(
							id,
							block.type,
							typeof block.content === "string"
								? block.content
								: JSON.stringify(block.content),
							block.order_index ?? index,
						),
					),
				);
			}
		}

		// Fetch updated newsletter
		const fetchStmt = db.prepare("SELECT * FROM newsletters WHERE id = ?");
		const newsletter = await fetchStmt.bind(id).first<Newsletter>();

		// Fetch blocks
		const blocksStmt = db.prepare(
			"SELECT * FROM newsletter_blocks WHERE newsletter_id = ? ORDER BY order_index",
		);
		const blocksResult = await blocksStmt.bind(id).all<NewsletterBlock>();

		return new Response(
			JSON.stringify({
				newsletter,
				blocks: blocksResult.results || [],
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error updating newsletter:", error);
		return new Response(
			JSON.stringify({ error: "Failed to update newsletter" }),
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
			return new Response(JSON.stringify({ error: "Invalid newsletter ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const stmt = db.prepare("DELETE FROM newsletters WHERE id = ?");
		await stmt.bind(id).run();

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error deleting newsletter:", error);
		return new Response(
			JSON.stringify({ error: "Failed to delete newsletter" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
