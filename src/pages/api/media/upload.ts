/**
 * Media Upload API
 * 
 * POST /api/media/upload
 */

import type { APIRoute } from "astro";
import { MediaRepository } from "~/lib/content-creation/db-schema";
import { validateImageFile } from "~/lib/content-creation/media-utils";
import type { UploadMediaResponse } from "~/lib/content-creation/types";

function getDB() {
	throw new Error("Database connection not configured");
}

function getStorage() {
	// Replace with actual storage (Cloudflare R2, S3, etc.)
	throw new Error("Storage not configured");
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const type = formData.get("type") as string;
		const altText = formData.get("altText") as string | null;

		if (!file || !type) {
			return new Response(
				JSON.stringify({ error: "File and type are required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		if (type === "image") {
			const validation = validateImageFile(file);
			if (!validation.valid) {
				return new Response(
					JSON.stringify({ error: validation.error }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			// Upload to storage
			const storage = getStorage();
			const fileId = crypto.randomUUID();
			const extension = file.name.split(".").pop() || "jpg";
			const fileName = `${fileId}.${extension}`;

			// In production, upload file to storage service
			// const url = await storage.upload(fileName, file);

			// For now, return placeholder
			const url = `/media/${fileName}`;

			const db = getDB();
			const repo = new MediaRepository(db);

			await repo.createAsset({
				id: fileId,
				type: "image",
				url,
				altText: altText || undefined,
			});

			const response: UploadMediaResponse = {
				id: fileId,
				type: "image",
				url,
				altText: altText || undefined,
			};

			return new Response(JSON.stringify(response), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(
			JSON.stringify({ error: "Unsupported media type" }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to upload media" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
