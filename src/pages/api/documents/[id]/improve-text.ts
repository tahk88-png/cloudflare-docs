/**
 * AI Text Improvement API
 * 
 * POST /api/documents/:id/improve-text
 */

import type { APIRoute } from "astro";
import { improveText } from "~/lib/content-creation/ai-client";
import { getDocumentRepository } from "~/lib/content-creation/db";
import type { ImproveTextRequest, ImproveTextResponse } from "~/lib/content-creation/types";

function getAIConfig() {
	// Get from environment variables
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

export const POST: APIRoute = async (context) => {
	try {
		const { id } = context.params;
		if (!id) {
			return new Response(JSON.stringify({ error: "Document ID required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body: ImproveTextRequest = await context.request.json();

		if (!body.text || !body.action || !body.language) {
			return new Response(
				JSON.stringify({
					error: "text, action, and language are required",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const aiConfig = getAIConfig();
		const result: ImproveTextResponse = await improveText(body, aiConfig);

		// Log the AI edit
		const repo = getDocumentRepository(context);

		await repo.logAIEdit({
			id: crypto.randomUUID(),
			documentId: id,
			blockId: body.blockId,
			action: body.action,
			tone: body.tone,
			language: body.language,
			originalText: body.text,
			improvedText: result.improvedText,
			changeSummary: result.changeSummary,
		});

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("AI improvement error:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Failed to improve text",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
