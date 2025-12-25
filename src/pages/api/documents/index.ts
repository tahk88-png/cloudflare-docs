/**
 * Documents API - CRUD operations
 * 
 * GET /api/documents - List documents
 * POST /api/documents - Create document
 */

import type { APIRoute } from "astro";
import { DocumentRepository } from "~/lib/content-creation/db-schema";
import type { CreateDocumentRequest } from "~/lib/content-creation/types";

// In production, get database from environment/context
// For now, this is a placeholder that shows the structure
function getDB() {
	// Replace with actual database connection
	// Example: return env.DB; (Cloudflare D1)
	throw new Error("Database connection not configured");
}

export const GET: APIRoute = async ({ request }) => {
	try {
		const db = getDB();
		const repo = new DocumentRepository(db);

		// In a real implementation, add pagination and filtering
		const documents = await db.query(
			`SELECT * FROM documents ORDER BY updated_at DESC LIMIT 100`,
		);

		return new Response(JSON.stringify({ documents }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to fetch documents" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const body: CreateDocumentRequest = await request.json();

		if (!body.title || !body.language) {
			return new Response(
				JSON.stringify({ error: "Title and language are required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const db = getDB();
		const repo = new DocumentRepository(db);

		const id = crypto.randomUUID();
		await repo.createDocument(id, body.title, body.language);

		const document = await repo.getDocument(id);

		return new Response(JSON.stringify({ document }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to create document" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
