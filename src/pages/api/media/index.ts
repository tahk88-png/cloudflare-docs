/**
 * Media Library API
 * 
 * GET /api/media - List media assets
 */

import type { APIRoute } from "astro";
import { getMediaRepository } from "~/lib/content-creation/db";

export const GET: APIRoute = async (context) => {
	try {
		const type = context.url.searchParams.get("type");

		const repo = getMediaRepository(context);

		const assets = await repo.listAssets(type || undefined);

		return new Response(JSON.stringify({ assets }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to fetch media assets:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch media assets" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
