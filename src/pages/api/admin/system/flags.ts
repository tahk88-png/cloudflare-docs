// POST /api/admin/system/flags - Admin endpoint to update feature flags
import type { APIRoute } from "astro";
import { FeatureFlagsService } from "../../../lib/feature-flags/service";
import { AuditService } from "../../../lib/feature-flags/audit";
import type { UpdateFlagsRequest } from "../../../lib/feature-flags/types";

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
	// For now, check for admin header or implement your auth logic
	const authHeader = request.headers.get("authorization");
	const userId = request.headers.get("x-user-id");
	const userEmail = request.headers.get("x-user-email");

	// TODO: Implement proper authentication
	// This is a placeholder - replace with your actual auth mechanism
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

		const body: UpdateFlagsRequest = await request.json();
		const { flags, reason } = body;

		if (!flags || typeof flags !== "object") {
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

		// Get current flags for audit
		const currentFlags = await service.getAllFlags();

		// Update each flag
		const updatedFlags: Record<string, boolean> = {};
		for (const [key, enabled] of Object.entries(flags)) {
			if (typeof enabled === "boolean") {
				const oldValue = currentFlags[key as keyof typeof currentFlags];
				await service.updateFlag(key as any, enabled);
				updatedFlags[key] = enabled;

				// Log the change
				await auditService.log(
					"update_flag",
					"feature_flag",
					{
						entityId: key,
						oldValue: { enabled: oldValue },
						newValue: { enabled },
						userId: auth.userId,
						userEmail: auth.userEmail,
						reason,
						ipAddress: clientInfo.ipAddress,
						userAgent: clientInfo.userAgent,
					},
				);
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				flags: updatedFlags,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error updating feature flags:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to update feature flags",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
