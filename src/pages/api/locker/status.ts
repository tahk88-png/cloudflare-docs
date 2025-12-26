/**
 * GET /api/locker/status
 * Get locker status
 */

import type { APIRoute } from "astro";
import { createLockerService } from "~/services/locker/init";

export const GET: APIRoute = async ({ request, locals }) => {
	try {
		const url = new URL(request.url);
		const lockerId = url.searchParams.get("locker_id");

		if (!lockerId) {
			return new Response(
				JSON.stringify({
					error: "Missing required parameter: locker_id",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Initialize service
		const env = (locals as any)?.runtime?.env || (globalThis as any)?.env || {};

		let lockerService;
		try {
			lockerService = createLockerService(env);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: "Service initialization failed",
					message: error instanceof Error ? error.message : String(error),
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Get locker status
		const status = await lockerService.getLockerStatus(lockerId);

		if (!status) {
			return new Response(
				JSON.stringify({
					error: "Locker not found or no status available",
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(JSON.stringify(status), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error getting locker status:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				message: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
