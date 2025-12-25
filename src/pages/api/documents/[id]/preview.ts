/**
 * Document Preview API
 * 
 * POST /api/documents/:id/preview
 */

import type { APIRoute } from "astro";
import { DocumentRepository } from "~/lib/content-creation/db-schema";
import type {
	PreviewRequest,
	PreviewResponse,
	DocumentBlock,
} from "~/lib/content-creation/types";
import { renderBlocksToHTML } from "~/lib/content-creation/renderer";

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

		const body: PreviewRequest = await request.json();
		const mode = body.mode || "web";

		const db = getDB();
		const repo = new DocumentRepository(db);

		const blocks = await repo.getDocumentBlocks(id);
		const blocksWithContent: DocumentBlock[] = blocks.map((block) => ({
			...block,
			content: JSON.parse(block.content_json),
		}));

		const { html, warnings } = await renderBlocksToHTML(
			blocksWithContent,
			mode,
		);

		const response: PreviewResponse = {
			html,
			warnings,
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to generate preview" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
