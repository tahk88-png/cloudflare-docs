/**
 * Storage Helper for Media Files
 * 
 * Handles upload and retrieval of media files using Cloudflare R2
 */

import type { APIContext } from "astro";

export interface UploadResult {
	url: string;
	key: string;
	size: number;
}

/**
 * Upload file to R2 storage
 */
export async function uploadFile(
	context: APIContext,
	file: File,
	key?: string,
): Promise<UploadResult> {
	const storage = (context.locals as any)?.runtime?.env?.CONTENT_MEDIA;
	
	if (!storage) {
		throw new Error("Storage not available. Make sure CONTENT_MEDIA binding is configured in wrangler.toml");
	}

	const fileKey = key || `${crypto.randomUUID()}.${getFileExtension(file.name)}`;
	const arrayBuffer = await file.arrayBuffer();

	await storage.put(fileKey, arrayBuffer, {
		httpMetadata: {
			contentType: file.type,
		},
	});

	// Generate public URL
	// In production, use your CDN domain or R2 public URL
	const url = `/media/${fileKey}`;

	return {
		url,
		key: fileKey,
		size: file.size,
	};
}

/**
 * Get file from R2 storage
 */
export async function getFile(
	context: APIContext,
	key: string,
): Promise<Response | null> {
	const storage = (context.locals as any)?.runtime?.env?.CONTENT_MEDIA;
	
	if (!storage) {
		throw new Error("Storage not available");
	}

	const object = await storage.get(key);
	
	if (!object) {
		return null;
	}

	return new Response(object.body, {
		headers: {
			"Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
			"Cache-Control": "public, max-age=31536000",
		},
	});
}

/**
 * Delete file from R2 storage
 */
export async function deleteFile(
	context: APIContext,
	key: string,
): Promise<void> {
	const storage = (context.locals as any)?.runtime?.env?.CONTENT_MEDIA;
	
	if (!storage) {
		throw new Error("Storage not available");
	}

	await storage.delete(key);
}

function getFileExtension(filename: string): string {
	const parts = filename.split(".");
	return parts.length > 1 ? parts[parts.length - 1] : "bin";
}
