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
		// Fallback for local development - store in memory or use data URL
		if (import.meta.env.DEV) {
			const fileKey = key || `${crypto.randomUUID()}.${getFileExtension(file.name)}`;
			// For local dev, create a data URL (not ideal but works for testing)
			const arrayBuffer = await file.arrayBuffer();
			const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
			const dataUrl = `data:${file.type};base64,${base64}`;
			
			// Store in a simple in-memory cache
			if (!(globalThis as any).__localMediaStorage) {
				(globalThis as any).__localMediaStorage = new Map();
			}
			(globalThis as any).__localMediaStorage.set(fileKey, dataUrl);
			
			return {
				url: `/api/media/${fileKey}`,
				key: fileKey,
				size: file.size,
			};
		}
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
	const url = `/api/media/${fileKey}`;

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
		// Fallback for local development
		if (import.meta.env.DEV && (globalThis as any).__localMediaStorage) {
			const dataUrl = (globalThis as any).__localMediaStorage.get(key);
			if (dataUrl) {
				// Extract base64 data from data URL
				const base64Data = dataUrl.split(",")[1];
				const binaryString = atob(base64Data);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				const contentType = dataUrl.match(/data:([^;]+)/)?.[1] || "application/octet-stream";
				return new Response(bytes, {
					headers: {
						"Content-Type": contentType,
						"Cache-Control": "public, max-age=31536000",
					},
				});
			}
		}
		return null;
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
