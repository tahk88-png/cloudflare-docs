/**
 * POST /api/locker/close
 * Close a locker
 */

import type { APIRoute } from "astro";
import { createLockerService } from "~/services/locker/init";

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { locker_id, booking_id, user_id, admin_api_key } = body;

		if (!locker_id || !booking_id) {
			return new Response(
				JSON.stringify({
					error: "Missing required fields: locker_id, booking_id",
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

		// Check admin override
		const adminOverride = admin_api_key
			? lockerService.isAdminRequest(admin_api_key)
			: false;

		// Execute close action
		const result = await lockerService.closeLocker({
			locker_id,
			booking_id,
			user_id,
			admin_override: adminOverride,
		});

		return new Response(JSON.stringify(result), {
			status: result.success ? 200 : 500,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error closing locker:", error);
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
