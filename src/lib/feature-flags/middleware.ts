// Middleware for Feature Flags and Maintenance Mode
import { FeatureFlagsService } from "./service";
import type { FeatureFlagKey, MaintenanceMode } from "./types";

export interface MiddlewareContext {
	db: D1Database;
	userId?: string;
	pathname: string;
}

export interface MiddlewareResult {
	allowed: boolean;
	status?: number;
	message?: string;
	redirect?: string;
}

/**
 * Check if a feature flag is enabled
 */
export async function checkFeatureFlag(
	context: MiddlewareContext,
	flagKey: FeatureFlagKey,
): Promise<boolean> {
	const service = new FeatureFlagsService(context.db);
	return await service.getFlag(flagKey);
}

/**
 * Check maintenance mode and determine if request should be allowed
 */
export async function checkMaintenanceMode(
	context: MiddlewareContext,
): Promise<MiddlewareResult> {
	const service = new FeatureFlagsService(context.db);
	const maintenance = await service.getMaintenanceMode();

	// If maintenance is disabled, allow all requests
	if (!maintenance.enabled || maintenance.mode === "none") {
		return { allowed: true };
	}

	// Check if user is admin and can bypass
	if (context.userId) {
		const canBypass = await service.checkMaintenanceBypass(context.userId);
		if (canBypass) {
			return { allowed: true };
		}
	}

	// Full maintenance: block all public requests
	if (maintenance.mode === "full") {
		return {
			allowed: false,
			status: 503,
			message: maintenance.message || "Service temporarily unavailable",
		};
	}

	// Partial maintenance: allow browsing but block checkout
	if (maintenance.mode === "partial") {
		const isCheckoutPath =
			context.pathname.includes("/checkout") ||
			context.pathname.includes("/api/checkout") ||
			context.pathname.includes("/api/booking");

		if (isCheckoutPath) {
			return {
				allowed: false,
				status: 503,
				message:
					maintenance.message ||
					"Checkout is temporarily unavailable. Please try again later.",
			};
		}

		// Allow other paths
		return { allowed: true };
	}

	return { allowed: true };
}

/**
 * Combined middleware that checks both feature flags and maintenance mode
 */
export async function featureFlagsMiddleware(
	context: MiddlewareContext,
	options?: {
		requiredFlags?: FeatureFlagKey[];
		checkMaintenance?: boolean;
	},
): Promise<MiddlewareResult> {
	const { requiredFlags = [], checkMaintenance = true } = options || {};

	// Check maintenance mode first
	if (checkMaintenance) {
		const maintenanceCheck = await checkMaintenanceMode(context);
		if (!maintenanceCheck.allowed) {
			return maintenanceCheck;
		}
	}

	// Check required feature flags
	if (requiredFlags.length > 0) {
		const service = new FeatureFlagsService(context.db);
		for (const flagKey of requiredFlags) {
			const enabled = await service.getFlag(flagKey);
			if (!enabled) {
				return {
					allowed: false,
					status: 503,
					message: `Feature ${flagKey} is currently disabled`,
				};
			}
		}
	}

	return { allowed: true };
}

/**
 * Helper to create middleware context from Astro request
 */
export function createMiddlewareContext(
	request: Request,
	db: D1Database,
): MiddlewareContext {
	const url = new URL(request.url);
	const userId = request.headers.get("x-user-id") || undefined;

	return {
		db,
		userId,
		pathname: url.pathname,
	};
}
