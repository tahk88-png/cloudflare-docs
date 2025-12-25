/**
 * Video Link API
 * 
 * POST /api/media/link-video
 */

import type { APIRoute } from "astro";
import {
	MediaRepository,
} from "~/lib/content-creation/db-schema";
import {
	detectVideoSource,
	extractYouTubeId,
	extractVimeoId,
	getYouTubeThumbnailUrl,
	getVimeoThumbnailUrl,
	validateVideoUrl,
} from "~/lib/content-creation/media-utils";
import type { UploadMediaResponse } from "~/lib/content-creation/types";

function getDB() {
	throw new Error("Database connection not configured");
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body: { url: string; title?: string } = await request.json();

		if (!body.url) {
			return new Response(
				JSON.stringify({ error: "Video URL is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const validation = validateVideoUrl(body.url);

		if (!validation.valid) {
			return new Response(
				JSON.stringify({ error: validation.error }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const source = validation.source!;
		const videoId = validation.videoId!;

		let thumbnailUrl: string | undefined;
		if (source === "youtube") {
			thumbnailUrl = getYouTubeThumbnailUrl(videoId);
		} else if (source === "vimeo") {
			thumbnailUrl = getVimeoThumbnailUrl(videoId);
		}

		const db = getDB();
		const repo = new MediaRepository(db);

		const mediaId = crypto.randomUUID();

		await repo.createAsset({
			id: mediaId,
			type: "video",
			url: body.url,
			thumbnailUrl,
		});

		const response: UploadMediaResponse = {
			id: mediaId,
			type: "video",
			url: body.url,
			thumbnailUrl,
		};

		return new Response(JSON.stringify(response), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to link video" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
