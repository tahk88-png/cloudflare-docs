/**
 * Runtime utilities for accessing Cloudflare bindings in Astro
 */

/// <reference types="@cloudflare/workers-types" />

export interface RuntimeEnv {
	INCIDENTS_DB?: D1Database;
	ADMIN_TOKEN?: string;
}

/**
 * Get runtime environment from Astro context
 * Works with both Cloudflare adapter and direct Workers deployment
 */
export function getRuntimeEnv(locals: any): RuntimeEnv | null {
	// Try Cloudflare adapter runtime
	if (locals.runtime?.env) {
		return locals.runtime.env as RuntimeEnv;
	}

	// Try direct runtime access
	if (locals.runtime) {
		return locals.runtime as RuntimeEnv;
	}

	return null;
}

/**
 * Get D1 database from runtime
 */
export function getDatabase(locals: any): D1Database | null {
	const env = getRuntimeEnv(locals);
	return env?.INCIDENTS_DB || null;
}

/**
 * Get admin token from runtime
 */
export function getAdminToken(locals: any): string | undefined {
	const env = getRuntimeEnv(locals);
	return env?.ADMIN_TOKEN;
}
