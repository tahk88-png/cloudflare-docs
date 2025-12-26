// GET /api/system/flags - Public endpoint to get current feature flags and maintenance status
import type { APIRoute } from "astro";
import { FeatureFlagsService } from "../../lib/feature-flags/service";

export const GET: APIRoute = async ({ request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			return new Response(
				JSON.stringify({ error: "Database not configured" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const service = new FeatureFlagsService(platform.env.DB);
		const flags = await service.getAllFlags();
		const maintenance = await service.getMaintenanceMode();

		return new Response(
			JSON.stringify({
				flags,
				maintenance: {
					mode: maintenance.mode,
					enabled: maintenance.enabled,
					message: maintenance.message,
				},
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "public, max-age=5", // 5 second cache
				},
			},
		);
	} catch (error) {
		console.error("Error fetching feature flags:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to fetch feature flags",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
