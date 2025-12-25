/**
 * AI Media Placement Suggestion API
 * 
 * POST /api/ai/suggest-media-placement
 */

import type { APIRoute } from "astro";
import { suggestMediaPlacement } from "~/lib/content-creation/ai-client";
import type {
	SuggestMediaPlacementRequest,
	SuggestMediaPlacementResponse,
} from "~/lib/content-creation/types";

function getAIConfig() {
	const apiKey = import.meta.env.AI_API_KEY || process.env.AI_API_KEY;
	if (!apiKey) {
		throw new Error("AI API key not configured");
	}
	return {
		apiKey,
		model: import.meta.env.AI_MODEL || process.env.AI_MODEL || "gpt-4o-mini",
		baseUrl: import.meta.env.AI_BASE_URL || process.env.AI_BASE_URL,
	};
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body: SuggestMediaPlacementRequest = await request.json();

		if (!body.documentId || !body.blockId || !body.context) {
			return new Response(
				JSON.stringify({
					error: "documentId, blockId, and context are required",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const aiConfig = getAIConfig();
		const result: SuggestMediaPlacementResponse = await suggestMediaPlacement(
			body,
			aiConfig,
		);

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("AI suggestion error:", error);
		return new Response(
			JSON.stringify({
				error:
					error instanceof Error
						? error.message
						: "Failed to generate suggestion",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
