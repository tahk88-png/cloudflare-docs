/**
 * Media File Serving API
 * 
 * GET /api/media/:key - Serve media files from R2
 */

import type { APIRoute } from "astro";
import { getFile } from "~/lib/content-creation/storage";

export const GET: APIRoute = async (context) => {
	try {
		const { key } = context.params;
		if (!key) {
			return new Response("File key required", { status: 400 });
		}

		const file = await getFile(context, key);
		
		if (!file) {
			return new Response("File not found", { status: 404 });
		}

		return file;
	} catch (error) {
		console.error("Failed to serve media file:", error);
		return new Response("Failed to serve file", { status: 500 });
	}
};
