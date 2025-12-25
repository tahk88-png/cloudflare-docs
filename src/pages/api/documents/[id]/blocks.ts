/**
 * Document Blocks API
 * 
 * POST /api/documents/:id/blocks - Save/update blocks
 * PUT /api/documents/:id/blocks/reorder - Reorder blocks
 */

import type { APIRoute } from "astro";
import { DocumentRepository } from "~/lib/content-creation/db-schema";
import type { DocumentBlock } from "~/lib/content-creation/types";

function getDB() {
	throw new Error("Database connection not configured");
}

export const POST: APIRoute = async ({ params, request }) => {
	try {
		const { id } = params;
		if (!id) {
			return new Response(JSON.stringify({ error: "Document ID required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body: { blocks: DocumentBlock[] } = await request.json();

		if (!body.blocks || !Array.isArray(body.blocks)) {
			return new Response(
				JSON.stringify({ error: "Blocks array is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const db = getDB();
		const repo = new DocumentRepository(db);

		// Save all blocks
		for (const block of body.blocks) {
			await repo.saveBlock({
				id: block.id,
				documentId: id,
				type: block.type,
				contentJson: JSON.stringify(block.content),
				order: block.order,
			});
		}

		// Update document updated_at
		await repo.updateDocument(id);

		const blocks = await repo.getDocumentBlocks(id);
		const blocksWithContent = blocks.map((block) => ({
			...block,
			content: JSON.parse(block.content_json),
		}));

		return new Response(JSON.stringify({ blocks: blocksWithContent }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to save blocks" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const PUT: APIRoute = async ({ params, request }) => {
	try {
		const { id } = params;
		if (!id) {
			return new Response(JSON.stringify({ error: "Document ID required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body: { blockOrders: Array<{ id: string; order: number }> } =
			await request.json();

		if (!body.blockOrders || !Array.isArray(body.blockOrders)) {
			return new Response(
				JSON.stringify({ error: "blockOrders array is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const db = getDB();
		const repo = new DocumentRepository(db);

		await repo.reorderBlocks(id, body.blockOrders);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to reorder blocks" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
