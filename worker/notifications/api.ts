/**
 * Notification API endpoints
 */

import type { NotificationPayload } from "./types.js";
import { NotificationService } from "./service.js";
import {
	createLog,
	updateLogStatus,
	getLogs,
	initDatabase,
} from "./db.js";

/**
 * Initialize notification service from environment
 */
function createNotificationService(env: Env): NotificationService {
	return new NotificationService({
		email: {
			fromEmail: env.NOTIFICATION_FROM_EMAIL || "noreply@rentbox.ee",
			fromName: env.NOTIFICATION_FROM_NAME || "Rentbox.ee",
			apiKey: env.SENDGRID_API_KEY || env.MAILGUN_API_KEY,
			provider: env.EMAIL_PROVIDER as
				| "cloudflare"
				| "sendgrid"
				| "mailgun"
				| undefined,
		},
		sms: {
			fromNumber: env.TWILIO_FROM_NUMBER || "",
			accountSid: env.TWILIO_ACCOUNT_SID,
			authToken: env.TWILIO_AUTH_TOKEN,
			provider: "twilio",
		},
		whatsapp: env.TWILIO_WHATSAPP_FROM
			? {
					fromNumber: env.TWILIO_WHATSAPP_FROM,
					accountSid: env.TWILIO_ACCOUNT_SID,
					authToken: env.TWILIO_AUTH_TOKEN,
					provider: "twilio",
				}
			: undefined,
		maxRetries: env.NOTIFICATION_MAX_RETRIES
			? parseInt(env.NOTIFICATION_MAX_RETRIES)
			: 3,
		retryDelayMs: env.NOTIFICATION_RETRY_DELAY_MS
			? parseInt(env.NOTIFICATION_RETRY_DELAY_MS)
			: 5000,
	});
}

/**
 * POST /api/notifications/send
 * Send a notification
 */
export async function handleSendNotification(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		// Validate request
		if (request.method !== "POST") {
			return new Response(
				JSON.stringify({ error: "Method not allowed" }),
				{ status: 405, headers: { "Content-Type": "application/json" } },
			);
		}

		// Parse payload
		const payload: NotificationPayload = await request.json();

		// Validate payload
		if (!payload.event || !payload.recipient || !payload.channels) {
			return new Response(
				JSON.stringify({
					error: "Missing required fields: event, recipient, channels",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Ensure priority is set (default to transactional)
		if (!payload.priority) {
			payload.priority = "transactional";
		}

		// Initialize database if needed
		if (env.NOTIFICATION_DB) {
			await initDatabase(env.NOTIFICATION_DB);
		}

		// Create notification service
		const service = createNotificationService(env);

		// Send notifications
		const results = await service.send(payload, env);

		// Log results to database
		const logIds: string[] = [];
		if (env.NOTIFICATION_DB) {
			for (const result of results) {
				const recipient =
					result.channel === "email"
						? payload.recipient.email
						: payload.recipient.phone || "";

				if (!recipient) continue;

				const logId = await createLog(env.NOTIFICATION_DB, {
					event: payload.event,
					channel: result.channel,
					recipient,
					status: result.result.success ? "sent" : "failed",
					priority: payload.priority,
					bookingId: payload.bookingId,
					rentalId: payload.rentalId,
					attempts: 1,
					lastAttemptAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),
					sentAt: result.result.success
						? new Date().toISOString()
						: undefined,
					error: result.result.error,
					metadata: result.result.metadata,
				});

				logIds.push(logId);

				// If failed, mark for retry
				if (!result.result.success) {
					await updateLogStatus(
						env.NOTIFICATION_DB,
						logId,
						"retrying",
						result.result.error,
					);
				}
			}
		}

		// Return response
		const success = results.every((r) => r.result.success);
		return new Response(
			JSON.stringify({
				success,
				results: results.map((r, i) => ({
					channel: r.channel,
					success: r.result.success,
					messageId: r.result.messageId,
					logId: logIds[i],
					error: r.result.error,
				})),
			}),
			{
				status: success ? 200 : 207, // 207 Multi-Status if some failed
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error sending notification:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				message:
					error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

/**
 * GET /api/admin/notifications/logs
 * Get notification logs
 */
export async function handleGetLogs(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		// Validate request
		if (request.method !== "GET") {
			return new Response(
				JSON.stringify({ error: "Method not allowed" }),
				{ status: 405, headers: { "Content-Type": "application/json" } },
			);
		}

		// Check authentication (basic admin check)
		const authHeader = request.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return new Response(
				JSON.stringify({ error: "Unauthorized" }),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}

		const token = authHeader.substring(7);
		if (token !== env.ADMIN_API_KEY) {
			return new Response(
				JSON.stringify({ error: "Unauthorized" }),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}

		// Parse query parameters
		const url = new URL(request.url);
		const limit = parseInt(url.searchParams.get("limit") || "100");
		const offset = parseInt(url.searchParams.get("offset") || "0");
		const event = url.searchParams.get("event") || undefined;
		const status = url.searchParams.get("status") || undefined;
		const bookingId = url.searchParams.get("bookingId") || undefined;
		const rentalId = url.searchParams.get("rentalId") || undefined;
		const recipient = url.searchParams.get("recipient") || undefined;
		const startDate = url.searchParams.get("startDate") || undefined;
		const endDate = url.searchParams.get("endDate") || undefined;

		if (!env.NOTIFICATION_DB) {
			return new Response(
				JSON.stringify({ error: "Database not configured" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		// Initialize database if needed
		await initDatabase(env.NOTIFICATION_DB);

		// Get logs
		const logs = await getLogs(env.NOTIFICATION_DB, {
			limit,
			offset,
			event,
			status,
			bookingId,
			rentalId,
			recipient,
			startDate,
			endDate,
		});

		// Get total count (for pagination)
		const countResult = await env.NOTIFICATION_DB
			.prepare("SELECT COUNT(*) as count FROM notification_logs")
			.first<{ count: number }>();

		return new Response(
			JSON.stringify({
				logs,
				pagination: {
					limit,
					offset,
					total: countResult?.count || 0,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error getting logs:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				message:
					error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
