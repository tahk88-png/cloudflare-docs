/**
 * Database Helper for Astro API Routes
 * 
 * Provides database access in Astro API routes using Cloudflare D1
 */

import type { APIContext } from "astro";
import { DocumentRepository, MediaRepository } from "./db-schema";
import type { Database } from "./db-schema";

/**
 * Get database instance from Astro context
 */
export function getDB(context: APIContext): Database {
	// Try to get from runtime env (Cloudflare Workers)
	const db = (context.locals as any)?.runtime?.env?.CONTENT_DB;
	
	if (!db) {
		// Fallback for development - you may need to adjust this
		throw new Error("Database not available. Make sure CONTENT_DB binding is configured in wrangler.toml");
	}

	return {
		query: async (sql: string, params?: any[]) => {
			const stmt = db.prepare(sql);
			const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
			const result = await bound.all();
			return result.results || [];
		},
		exec: async (sql: string) => {
			await db.exec(sql);
		},
	};
}

/**
 * Get R2 storage instance from Astro context
 */
export function getStorage(context: APIContext): R2Bucket {
	const storage = context.locals.runtime?.env?.CONTENT_MEDIA;
	
	if (!storage) {
		throw new Error("Storage not available. Make sure CONTENT_MEDIA binding is configured.");
	}

	return storage;
}

/**
 * Get document repository
 */
export function getDocumentRepository(context: APIContext): DocumentRepository {
	return new DocumentRepository(getDB(context));
}

/**
 * Get media repository
 */
export function getMediaRepository(context: APIContext): MediaRepository {
	return new MediaRepository(getDB(context));
}
