// GET /api/images - List images
// POST /api/images - Upload image

import type { APIRoute } from "astro";
import { getDBFromContext } from "~/lib/db/client";
import type { NewsletterImage } from "~/lib/db/types";

export const GET: APIRoute = async (context) => {
	try {
		const db = getDBFromContext(context);

		const stmt = db.prepare(
			"SELECT * FROM newsletter_images ORDER BY created_at DESC LIMIT 100",
		);
		const result = await stmt.all<NewsletterImage>();

		return new Response(JSON.stringify({ images: result.results || [] }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching images:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch images" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const POST: APIRoute = async (context) => {
	const { request } = context;
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const alt_text = (formData.get("alt_text") as string) || null;

		if (!file) {
			return new Response(JSON.stringify({ error: "No file provided" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Validate file type
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		if (!allowedTypes.includes(file.type)) {
			return new Response(
				JSON.stringify({
					error: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Validate file size (max 5MB)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (file.size > maxSize) {
			return new Response(
				JSON.stringify({ error: "File size exceeds 5MB limit" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// In production, upload to R2 or similar storage
		// For now, we'll create a placeholder URL
		// In Cloudflare, you'd use R2 bucket binding
		const fileUrl = `/uploads/${Date.now()}-${file.name}`;

		// Get image dimensions (would need actual image processing in production)
		// For now, placeholder values
		const width = null;
		const height = null;

		const db = getDBFromContext(context);

		const stmt = db.prepare(
			`INSERT INTO newsletter_images (file_url, file_name, alt_text, width, height, file_size)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		);

		const result = await stmt
			.bind(
				fileUrl,
				file.name,
				alt_text,
				width,
				height,
				file.size,
			)
			.run();

		// Fetch the created image
		const fetchStmt = db.prepare("SELECT * FROM newsletter_images WHERE id = ?");
		const image = await fetchStmt.bind(result.meta.last_row_id).first<NewsletterImage>();

		return new Response(JSON.stringify({ image }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error uploading image:", error);
		return new Response(
			JSON.stringify({ error: "Failed to upload image" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
