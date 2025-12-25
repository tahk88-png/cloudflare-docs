/**
 * Video Link API
 * 
 * POST /api/media/link-video
 */

import type { APIRoute } from "astro";
import { getMediaRepository } from "~/lib/content-creation/db";
import {
	detectVideoSource,
	extractYouTubeId,
	extractVimeoId,
	getYouTubeThumbnailUrl,
	getVimeoThumbnailUrl,
	validateVideoUrl,
} from "~/lib/content-creation/media-utils";
import type { UploadMediaResponse } from "~/lib/content-creation/types";

export const POST: APIRoute = async (context) => {
	try {
		const body: { url: string; title?: string } = await context.request.json();

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

		const repo = getMediaRepository(context);

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
		console.error("Failed to link video:", error);
		return new Response(
			JSON.stringify({ error: "Failed to link video" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
