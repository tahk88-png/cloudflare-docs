/**
 * Document API - Single document operations
 * 
 * GET /api/documents/:id - Get document with blocks
 * PUT /api/documents/:id - Update document
 * DELETE /api/documents/:id - Delete document
 */

import type { APIRoute } from "astro";
import { getDocumentRepository } from "~/lib/content-creation/db";
import type { UpdateDocumentRequest } from "~/lib/content-creation/types";

export const GET: APIRoute = async (context) => {
	try {
		const { id } = context.params;
		if (!id) {
			return new Response(JSON.stringify({ error: "Document ID required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const repo = getDocumentRepository(context);

		const document = await repo.getDocument(id);
		if (!document) {
			return new Response(JSON.stringify({ error: "Document not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const blocks = await repo.getDocumentBlocks(id);
		const blocksWithContent = blocks.map((block) => ({
			...block,
			content: JSON.parse(block.content_json),
		}));

		return new Response(
			JSON.stringify({
				document,
				blocks: blocksWithContent,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Failed to fetch document:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch document" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const PUT: APIRoute = async (context) => {
	try {
		const { id } = context.params;
		if (!id) {
			return new Response(JSON.stringify({ error: "Document ID required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body: UpdateDocumentRequest = await context.request.json();
		const repo = getDocumentRepository(context);

		await repo.updateDocument(id, body.title, body.language);

		const document = await repo.getDocument(id);

		return new Response(JSON.stringify({ document }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to update document:", error);
		return new Response(
			JSON.stringify({ error: "Failed to update document" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const DELETE: APIRoute = async (context) => {
	try {
		const { id } = context.params;
		if (!id) {
			return new Response(JSON.stringify({ error: "Document ID required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const repo = getDocumentRepository(context);

		await repo.deleteDocument(id);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to delete document:", error);
		return new Response(
			JSON.stringify({ error: "Failed to delete document" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
