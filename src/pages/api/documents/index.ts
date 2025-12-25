/**
 * Documents API - CRUD operations
 * 
 * GET /api/documents - List documents
 * POST /api/documents - Create document
 */

import type { APIRoute } from "astro";
import { getDocumentRepository } from "~/lib/content-creation/db";
import type { CreateDocumentRequest } from "~/lib/content-creation/types";

export const GET: APIRoute = async (context) => {
	try {
		const repo = getDocumentRepository(context);
		const db = repo["db"] as any;

		// Get documents with pagination
		const result = await db.query(
			`SELECT * FROM documents ORDER BY updated_at DESC LIMIT 100`,
		);
		const documents = result || [];

		return new Response(JSON.stringify({ documents }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to fetch documents:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch documents" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const POST: APIRoute = async (context) => {
	try {
		const body: CreateDocumentRequest = await context.request.json();

		if (!body.title || !body.language) {
			return new Response(
				JSON.stringify({ error: "Title and language are required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const repo = getDocumentRepository(context);

		const id = crypto.randomUUID();
		await repo.createDocument(id, body.title, body.language);

		const document = await repo.getDocument(id);

		return new Response(JSON.stringify({ document }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to create document:", error);
		return new Response(
			JSON.stringify({ error: "Failed to create document" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
