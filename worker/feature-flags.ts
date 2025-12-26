// Worker Integration for Feature Flags
import { FeatureFlagsService } from "../src/lib/feature-flags/service";
import {
	featureFlagsMiddleware,
	createMiddlewareContext,
} from "../src/lib/feature-flags/middleware";

/**
 * Integrate feature flags into Cloudflare Worker
 */
export async function handleFeatureFlags(
	request: Request,
	env: Env,
): Promise<Response | null> {
	// Skip for admin endpoints
	const url = new URL(request.url);
	if (url.pathname.startsWith("/api/admin/")) {
		return null; // Let the route handle it
	}

	// Get database
	const db = env.DB;
	if (!db) {
		return null; // Continue without feature flag checks
	}

	// Create middleware context
	const context = createMiddlewareContext(request, db);

	// Check maintenance mode and feature flags
	const result = await featureFlagsMiddleware(context, {
		checkMaintenance: true,
	});

	if (!result.allowed) {
		return new Response(
			JSON.stringify({
				error: result.message || "Service unavailable",
				maintenance: true,
			}),
			{
				status: result.status || 503,
				headers: {
					"Content-Type": "application/json",
					"Retry-After": "60",
				},
			},
		);
	}

	return null; // Continue to next handler
}

/**
 * Example: Check feature flag before processing request
 */
export async function checkFlag(
	db: D1Database,
	flagKey: string,
): Promise<boolean> {
	const service = new FeatureFlagsService(db);
	return await service.getFlag(flagKey as any);
}

/**
 * Example: Get all flags for frontend
 */
export async function getAllFlags(db: D1Database) {
	const service = new FeatureFlagsService(db);
	return await service.getAllFlags();
}
