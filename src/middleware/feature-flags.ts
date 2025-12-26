// Astro Middleware for Feature Flags and Maintenance Mode
import { defineMiddleware } from "astro:middleware";
import {
	featureFlagsMiddleware,
	createMiddlewareContext,
} from "../lib/feature-flags/middleware";

export const onRequest = defineMiddleware(async (context, next) => {
	// Skip middleware for admin endpoints and static assets
	const pathname = context.url.pathname;
	if (
		pathname.startsWith("/api/admin/") ||
		pathname.startsWith("/_astro/") ||
		pathname.startsWith("/assets/") ||
		pathname.startsWith("/favicon")
	) {
		return next();
	}

	// Get database from platform
	const db = context.locals.platform?.env?.DB;
	if (!db) {
		// If DB is not available, continue without feature flag checks
		// This allows the app to work in development without D1
		return next();
	}

	// Create middleware context
	const middlewareContext = createMiddlewareContext(context.request, db);

	// Check maintenance mode and feature flags
	const result = await featureFlagsMiddleware(middlewareContext, {
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

	return next();
});
