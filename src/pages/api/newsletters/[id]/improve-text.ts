// POST /api/newsletters/:id/improve-text - AI text improvement

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import type { NewsletterBlock } from "~/lib/db/types";

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
		if (body.blockIds && body.blockIds.length > 0) {
			const placeholders = body.blockIds.map(() => "?").join(",");
			blocksStmt = db.prepare(
				`SELECT * FROM newsletter_blocks 
				 WHERE newsletter_id = ? AND id IN (${placeholders}) 
				 ORDER BY order_index`,
			);
			blocksStmt = blocksStmt.bind(id, ...body.blockIds);
		} else {
			blocksStmt = db.prepare(
				"SELECT * FROM newsletter_blocks WHERE newsletter_id = ? ORDER BY order_index",
			);
			blocksStmt = blocksStmt.bind(id);
		}

		const blocksResult = await blocksStmt.all<NewsletterBlock>();
		const blocks = blocksResult.results || [];

		if (blocks.length === 0) {
			return new Response(
				JSON.stringify({ error: "No blocks found to improve" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Call AI improvement service
		const improvedBlocks = await improveTextWithAI(blocks, body);

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
): Promise<NewsletterBlock[]> {
	// TODO: Replace with actual AI integration
	// See SETUP_NEWSLETTER.md for integration examples
	
	// Extract text from blocks
	const textBlocks = blocks.filter(
		(b) => b.type === "paragraph" || b.type === "heading",
	);
	
	if (textBlocks.length === 0) {
		return blocks;
	}

	const textToImprove = textBlocks
		.map((b) => {
			const content = JSON.parse(b.content);
			return content.text || "";
		})
		.join("\n\n");

	const prompt = buildAIPrompt(textBlocks, options);

	// Mock AI response - replace with actual AI API call
	// Example: const improvedText = await callOpenAI(prompt, apiKey);
	console.log("AI Prompt:", prompt);

	// Simulate AI improvement
	// In production, parse the AI response and update blocks accordingly
	const improvedBlocks = blocks.map((block) => {
		const content = JSON.parse(block.content);
		if (block.type === "paragraph" || block.type === "heading") {
			// Mock improvement - add "[AI Improved]" prefix
			// In production, replace with actual AI-improved text
			return {
				...block,
				content: JSON.stringify({
					...content,
					text: `[AI Improved] ${content.text}`,
				}),
			};
		}
		return block;
	});

	return improvedBlocks;
}

function buildAIPrompt(
	blocks: NewsletterBlock[],
	options: AIImprovementRequest,
): string {
	const textBlocks = blocks
		.filter((b) => b.type === "paragraph" || b.type === "heading")
		.map((b) => {
			const content = JSON.parse(b.content);
			return content.text || "";
		})
		.join("\n\n");

	const actionPrompts: Record<string, string> = {
		"improve-clarity": "Improve clarity and readability",
		shorten: "Make it more concise while preserving key information",
		"make-persuasive": "Make it more persuasive and compelling",
		"make-friendly": "Make it more friendly and approachable",
		"make-professional": "Make it more professional and formal",
		"fix-grammar": "Fix grammar and spelling errors",
		"improve-cta": "Improve call-to-action effectiveness",
		"highlight-offer": "Better highlight the offer or value proposition",
	};

	const prompt = `
You are a professional email copywriter. ${actionPrompts[options.action] || "Improve the text"}.

${options.tone ? `Tone: ${options.tone}` : ""}
${options.targetAudience ? `Target audience: ${options.targetAudience}` : ""}

Rules:
- Preserve the original meaning
- Avoid spam language
- Avoid false promises
- Keep it professional
- Maintain Estonian language if the text is in Estonian

Text to improve:
${textBlocks}

Return the improved text in the same format.
`;

	return prompt;
}
