/**
 * Utility functions for accessing Cloudflare Workers runtime environment
 * in Astro API routes
 */

export interface RuntimeEnv {
	DB?: D1Database;
	RETURN_PHOTOS_BUCKET?: R2Bucket;
	EMAIL_SERVICE?: Fetcher;
}

export function getRuntimeEnv(locals: any): RuntimeEnv | null {
	// In Astro with Cloudflare adapter, runtime is available via locals.runtime.env
	if (locals?.runtime?.env) {
		return locals.runtime.env as RuntimeEnv;
	}

	// Fallback for development/testing
	if (typeof process !== "undefined" && process.env) {
		// In development, you might want to use a mock or local database
		console.warn("Runtime environment not available, using fallback");
		return null;
	}

	return null;
}
