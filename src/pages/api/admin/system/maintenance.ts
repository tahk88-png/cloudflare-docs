// POST /api/admin/system/maintenance - Admin endpoint to update maintenance mode
import type { APIRoute } from "astro";
import { FeatureFlagsService } from "../../../lib/feature-flags/service";
import { AuditService } from "../../../lib/feature-flags/audit";
import type { UpdateMaintenanceRequest } from "../../../lib/feature-flags/types";

function getClientInfo(request: Request): {
	ipAddress: string;
	userAgent: string;
} {
	const ipAddress =
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-forwarded-for") ||
		"unknown";
	const userAgent = request.headers.get("user-agent") || "unknown";

	return { ipAddress, userAgent };
}

function isAuthorized(request: Request): { authorized: boolean; userId?: string; userEmail?: string } {
	// In production, implement proper authentication (e.g., Cloudflare Access, JWT, etc.)
	const authHeader = request.headers.get("authorization");
	const userId = request.headers.get("x-user-id");
	const userEmail = request.headers.get("x-user-email");

	// TODO: Implement proper authentication
	if (authHeader?.startsWith("Bearer ") || userId) {
		return {
			authorized: true,
			userId: userId || "system",
			userEmail: userEmail || undefined,
		};
	}

	return { authorized: false };
}

export const POST: APIRoute = async ({ request, platform }) => {
	try {
		// Check authorization
		const auth = isAuthorized(request);
		if (!auth.authorized) {
			return new Response(
				JSON.stringify({ error: "Unauthorized" }),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		if (!platform?.env?.DB) {
			return new Response(
				JSON.stringify({ error: "Database not configured" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const body: UpdateMaintenanceRequest = await request.json();
		const { mode, enabled, message, reason } = body;

		if (!mode || !["none", "full", "partial"].includes(mode)) {
			return new Response(
				JSON.stringify({ error: "Invalid maintenance mode" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const service = new FeatureFlagsService(platform.env.DB);
		const auditService = new AuditService(platform.env.DB);
		const clientInfo = getClientInfo(request);

		// Get current maintenance mode for audit
		const currentMaintenance = await service.getMaintenanceMode();

		// Update maintenance mode
		const updated = await service.updateMaintenanceMode(
			mode,
			enabled,
			message,
		);

		// Log the change
		await auditService.log(
			"update_maintenance",
			"maintenance_mode",
			{
				entityId: updated.id.toString(),
				oldValue: {
					mode: currentMaintenance.mode,
					enabled: currentMaintenance.enabled,
					message: currentMaintenance.message,
				},
				newValue: {
					mode: updated.mode,
					enabled: updated.enabled,
					message: updated.message,
				},
				userId: auth.userId,
				userEmail: auth.userEmail,
				reason,
				ipAddress: clientInfo.ipAddress,
				userAgent: clientInfo.userAgent,
			},
		);

		return new Response(
			JSON.stringify({
				success: true,
				maintenance: {
					mode: updated.mode,
					enabled: updated.enabled,
					message: updated.message,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error updating maintenance mode:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to update maintenance mode",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
