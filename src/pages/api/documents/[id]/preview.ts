/**
 * Document Preview API
 * 
 * POST /api/documents/:id/preview
 */

import type { APIRoute } from "astro";
import { getDocumentRepository } from "~/lib/content-creation/db";
import type {
	PreviewRequest,
	PreviewResponse,
	DocumentBlock,
} from "~/lib/content-creation/types";
import { renderBlocksToHTML } from "~/lib/content-creation/renderer";

export const POST: APIRoute = async (context) => {
	try {
		const { id } = context.params;
		if (!id) {
			return new Response(JSON.stringify({ error: "Document ID required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body: PreviewRequest = await context.request.json();
		const mode = body.mode || "web";

		const repo = getDocumentRepository(context);

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
		console.error("Failed to generate preview:", error);
		return new Response(
			JSON.stringify({ error: "Failed to generate preview" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
