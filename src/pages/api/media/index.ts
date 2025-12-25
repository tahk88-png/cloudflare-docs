/**
 * Media Library API
 * 
 * GET /api/media - List media assets
 */

import type { APIRoute } from "astro";
import { MediaRepository } from "~/lib/content-creation/db-schema";

function getDB() {
	throw new Error("Database connection not configured");
}

export const GET: APIRoute = async ({ url }) => {
	try {
		const type = url.searchParams.get("type");

		const db = getDB();
		const repo = new MediaRepository(db);

		const assets = await repo.listAssets(type || undefined);

		return new Response(JSON.stringify({ assets }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: "Failed to fetch media assets" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
