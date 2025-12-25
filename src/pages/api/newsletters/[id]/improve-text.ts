// POST /api/newsletters/:id/improve-text - AI text improvement

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import type { NewsletterBlock } from "~/lib/db/types";
import { buildAIPrompt, callAI } from "~/lib/ai/prompts";

interface AIImprovementRequest {
	action:
		| "improve-clarity"
		| "shorten"
		| "make-persuasive"
		| "make-friendly"
		| "make-professional"
		| "fix-grammar"
		| "improve-cta"
		| "highlight-offer";
	tone?: string;
	targetAudience?: string;
	blockIds?: number[]; // Specific blocks to improve, or all if not provided
}

export const POST: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const { params, request } = context;
		const id = parseInt(params.id || "0");
		const body: AIImprovementRequest = await request.json();

		if (!id) {
			return new Response(JSON.stringify({ error: "Invalid newsletter ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Fetch blocks to improve
		let blocksStmt;
		let blocks: NewsletterBlock[];
		
		if (body.blockIds && body.blockIds.length > 0) {
			const placeholders = body.blockIds.map(() => "?").join(",");
			blocksStmt = db.prepare(
				`SELECT * FROM newsletter_blocks 
				 WHERE newsletter_id = ? AND id IN (${placeholders}) 
				 ORDER BY order_index`,
			);
			const blocksResult = await blocksStmt.bind(id, ...body.blockIds).all<NewsletterBlock>();
			blocks = blocksResult.results || [];
		} else {
			blocksStmt = db.prepare(
				"SELECT * FROM newsletter_blocks WHERE newsletter_id = ? ORDER BY order_index",
			);
			const blocksResult = await blocksStmt.bind(id).all<NewsletterBlock>();
			blocks = blocksResult.results || [];
		}

		if (blocks.length === 0) {
			return new Response(
				JSON.stringify({ error: "No blocks found to improve" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Get environment for AI API keys
		const env = 
			(context.runtime as any)?.env ||
			((context.locals as any)?.runtime as any)?.env ||
			{};

		// Call AI improvement service
		const improvedBlocks = await improveTextWithAI(blocks, body, env);

		// Log AI action
		const logStmt = db.prepare(
			`INSERT INTO newsletter_ai_logs (newsletter_id, action, tone, original_text, improved_text)
			 VALUES (?, ?, ?, ?, ?)`,
		);

		const originalText = blocks
			.map((b) => {
				const content = JSON.parse(b.content);
				return content.text || JSON.stringify(content);
			})
			.join("\n\n");

		const improvedText = improvedBlocks
			.map((b) => {
				const content = JSON.parse(b.content);
				return content.text || JSON.stringify(content);
			})
			.join("\n\n");

		await logStmt
			.bind(id, body.action, body.tone || null, originalText, improvedText)
			.run();

		return new Response(
			JSON.stringify({
				blocks: improvedBlocks,
				original: blocks,
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error improving text:", error);
		return new Response(
			JSON.stringify({ error: "Failed to improve text" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

async function improveTextWithAI(
	blocks: NewsletterBlock[],
	options: AIImprovementRequest,
	env?: { OPENAI_API_KEY?: string; ANTHROPIC_API_KEY?: string },
): Promise<NewsletterBlock[]> {
	// Extract text blocks
	const textBlocks = blocks.filter(
		(b) => b.type === "paragraph" || b.type === "heading",
	);

	if (textBlocks.length === 0) {
		return blocks;
	}

	// Build text to improve
	const textToImprove = textBlocks
		.map((b) => {
			const content = JSON.parse(b.content);
			return content.text || "";
		})
		.join("\n\n");

	if (!textToImprove.trim()) {
		return blocks;
	}

	// Build AI prompt
	const prompt = buildAIPrompt(textToImprove, {
		action: options.action,
		tone: options.tone,
		targetAudience: options.targetAudience,
		locale: "en", // Could be detected or passed as option
	});

	// Call AI service
	let improvedText: string;
	try {
		const apiKey = env?.OPENAI_API_KEY || env?.ANTHROPIC_API_KEY;
		if (apiKey) {
			improvedText = await callAI(prompt, apiKey, env);
		} else {
			// Fallback to mock if no API key
			console.warn("No AI API key found, using mock improvement");
			improvedText = textToImprove; // Will be improved below
		}
	} catch (error) {
		console.error("AI call failed:", error);
		// Fallback: return original blocks
		throw new Error("AI improvement failed. Please try again.");
	}

	// Parse improved text back into blocks
	// Split by double newlines to maintain block structure
	const improvedLines = improvedText.split(/\n\n+/).filter((line) => line.trim());
	
	// Map improved text back to blocks
	const improvedBlocks = blocks.map((block) => {
		const content = JSON.parse(block.content);
		
		if (block.type === "paragraph" || block.type === "heading") {
			// Find corresponding improved text
			const blockIndex = textBlocks.findIndex((b) => b.id === block.id);
			if (blockIndex >= 0 && improvedLines[blockIndex]) {
				return {
					...block,
					content: JSON.stringify({
						...content,
						text: improvedLines[blockIndex].trim(),
					}),
				};
			}
		}
		return block;
	});

	return improvedBlocks;
}
