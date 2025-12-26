// Example Usage of Feature Flags and Maintenance Mode

import { FeatureFlagsService } from "./service";
import { featureFlagsMiddleware, checkFeatureFlag } from "./middleware";
import type { FeatureFlagKey } from "./types";

/**
 * Example 1: Check a feature flag in an API route
 */
export async function exampleApiRoute(request: Request, db: D1Database) {
	const service = new FeatureFlagsService(db);

	// Check if booking is enabled
	const bookingEnabled = await service.getFlag("enable_booking");
	if (!bookingEnabled) {
		return new Response(
			JSON.stringify({ error: "Booking is currently disabled" }),
			{ status: 503 },
		);
	}

	// Proceed with booking logic
	return new Response(JSON.stringify({ success: true }));
}

/**
 * Example 2: Use middleware in Astro route
 */
export async function exampleAstroRoute(context: any) {
	const db = context.locals.platform?.env?.DB;
	if (!db) {
		return new Response("Database not available", { status: 500 });
	}

	const middlewareContext = {
		db,
		userId: context.request.headers.get("x-user-id"),
		pathname: context.url.pathname,
	};

	// Check maintenance mode and required flags
	const result = await featureFlagsMiddleware(middlewareContext, {
		requiredFlags: ["enable_checkout"],
		checkMaintenance: true,
	});

	if (!result.allowed) {
		return new Response(
			JSON.stringify({ error: result.message }),
			{ status: result.status || 503 },
		);
	}

	// Proceed with checkout logic
	return new Response("Checkout page");
}

/**
 * Example 3: Conditional feature rendering
 */
export async function exampleConditionalFeature(db: D1Database) {
	const service = new FeatureFlagsService(db);
	const discountsEnabled = await service.getFlag("enable_discounts");

	if (discountsEnabled) {
		// Render discount input field
		return `<input type="text" placeholder="Discount code" />`;
	}

	return "";
}

/**
 * Example 4: Update service health (for failsafe)
 */
export async function exampleUpdateServiceHealth(
	db: D1Database,
	serviceName: string,
	status: "healthy" | "degraded" | "down",
) {
	const service = new FeatureFlagsService(db);
	await service.updateServiceHealth(serviceName, status);

	// The service will automatically disable related features:
	// - If locker service is degraded/down → disable_locker_access
	// - If payments service is degraded/down → disable_checkout
}

/**
 * Example 5: Check multiple flags at once
 */
export async function exampleMultipleFlags(db: D1Database) {
	const service = new FeatureFlagsService(db);
	const flags = await service.getAllFlags();

	if (flags.enable_booking && flags.enable_checkout) {
		// Both features are enabled
		return true;
	}

	return false;
}

/**
 * Example 6: Admin bypass check
 */
export async function exampleAdminBypass(
	db: D1Database,
	userId: string,
): Promise<boolean> {
	const service = new FeatureFlagsService(db);
	return await service.checkMaintenanceBypass(userId);
}
