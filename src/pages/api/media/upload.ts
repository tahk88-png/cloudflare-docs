/**
 * Media Upload API
 * 
 * POST /api/media/upload
 */

import type { APIRoute } from "astro";
import { getMediaRepository } from "~/lib/content-creation/db";
import { uploadFile } from "~/lib/content-creation/storage";
import { validateImageFile } from "~/lib/content-creation/media-utils";
import type { UploadMediaResponse } from "~/lib/content-creation/types";

export const POST: APIRoute = async (context) => {
	try {
		const formData = await context.request.formData();
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
			const fileId = crypto.randomUUID();
			const uploadResult = await uploadFile(context, file, `${fileId}.${file.name.split(".").pop() || "jpg"}`);

			const repo = getMediaRepository(context);

			await repo.createAsset({
				id: fileId,
				type: "image",
				url: uploadResult.url,
				altText: altText || undefined,
			});

			const response: UploadMediaResponse = {
				id: fileId,
				type: "image",
				url: uploadResult.url,
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
		console.error("Failed to upload media:", error);
		return new Response(
			JSON.stringify({ error: "Failed to upload media" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
