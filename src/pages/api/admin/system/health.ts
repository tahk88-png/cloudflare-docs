// POST /api/admin/system/health - Admin endpoint to update service health status
import type { APIRoute } from "astro";
import { FeatureFlagsService } from "../../../lib/feature-flags/service";
import { AuditService } from "../../../lib/feature-flags/audit";
import type { ServiceStatus } from "../../../lib/feature-flags/types";

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

		const body: { serviceName: string; status: ServiceStatus } =
			await request.json();
		const { serviceName, status } = body;

		if (
			!serviceName ||
			!status ||
			!["healthy", "degraded", "down"].includes(status)
		) {
			return new Response(
				JSON.stringify({ error: "Invalid request body" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const service = new FeatureFlagsService(platform.env.DB);
		const auditService = new AuditService(platform.env.DB);
		const clientInfo = getClientInfo(request);

		// Get current status for audit
		const currentStatus = await service.getServiceHealth(serviceName);

		// Update service health
		const updated = await service.updateServiceHealth(serviceName, status);

		// Log the change
		await auditService.log(
			"update_service_health",
			"service_health",
			{
				entityId: serviceName,
				oldValue: { status: currentStatus },
				newValue: { status: updated.status },
				userId: auth.userId,
				userEmail: auth.userEmail,
				reason: `Service health updated to ${status}`,
				ipAddress: clientInfo.ipAddress,
				userAgent: clientInfo.userAgent,
			},
		);

		return new Response(
			JSON.stringify({
				success: true,
				service: {
					name: updated.service_name,
					status: updated.status,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error updating service health:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to update service health",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
