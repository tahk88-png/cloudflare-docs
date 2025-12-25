// GET /api/newsletters/:id/preview - Preview newsletter as email HTML

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import { generateEmailHTML, generatePlainText } from "~/lib/email/generator";
import type {
	Newsletter,
	NewsletterBlock,
	NewsletterImage,
	SenderProfile,
} from "~/lib/db/types";

export const GET: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);
		const { params, request } = context;
		const id = parseInt(params.id || "0");
		const url = new URL(request.url);
		const format = url.searchParams.get("format") || "html"; // html or text

		if (!id) {
			return new Response(JSON.stringify({ error: "Invalid newsletter ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Fetch newsletter
		const newsletterStmt = db.prepare("SELECT * FROM newsletters WHERE id = ?");
		const newsletter = await newsletterStmt.bind(id).first<Newsletter>();

		if (!newsletter) {
			return new Response(JSON.stringify({ error: "Newsletter not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Fetch blocks
		const blocksStmt = db.prepare(
			"SELECT * FROM newsletter_blocks WHERE newsletter_id = ? ORDER BY order_index",
		);
		const blocksResult = await blocksStmt.bind(id).all<NewsletterBlock>();
		const blocks = blocksResult.results || [];

		// Fetch sender profile if available
		let senderProfile: SenderProfile | null = null;
		if (newsletter.sender_id) {
			const senderStmt = db.prepare(
				"SELECT * FROM sender_profiles WHERE id = ?",
			);
			senderProfile = await senderStmt.bind(newsletter.sender_id).first<SenderProfile>();
		}

		// Fetch images referenced in blocks
		const imageIds = new Set<number>();
		blocks.forEach((block) => {
			if (block.type === "image") {
				const content = JSON.parse(block.content);
				if (content.image_id) {
					imageIds.add(content.image_id);
				}
			}
		});

		let images: NewsletterImage[] = [];
		if (imageIds.size > 0) {
			const placeholders = Array.from(imageIds).map(() => "?").join(",");
			const imagesStmt = db.prepare(
				`SELECT * FROM newsletter_images WHERE id IN (${placeholders})`,
			);
			const imagesResult = await imagesStmt
				.bind(...Array.from(imageIds))
				.all<NewsletterImage>();
			images = imagesResult.results || [];
		}

		if (format === "text") {
			const plainText = generatePlainText(newsletter, blocks);
			return new Response(plainText, {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
				},
			});
		}

		const html = generateEmailHTML({
			newsletter,
			blocks,
			images,
			senderProfile: senderProfile
				? {
						name: senderProfile.name,
						email: senderProfile.email,
						reply_to: senderProfile.reply_to,
					}
				: undefined,
		});

		return new Response(html, {
			headers: {
				"Content-Type": "text/html; charset=utf-8",
			},
		});
	} catch (error) {
		console.error("Error generating preview:", error);
		return new Response(
			JSON.stringify({ error: "Failed to generate preview" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
