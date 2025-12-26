/**
 * Script to send return reminders when bookings reach end_at
 * This should be run as a scheduled task (e.g., Cloudflare Workers Cron Trigger)
 */

interface Booking {
	id: string;
	user_id: string;
	tool_id: string;
	end_at: string;
	status: string;
	return_status?: string;
}

interface Env {
	DB: D1Database;
	EMAIL_SERVICE?: Fetcher; // Your email service worker/binding
}

export async function sendReturnReminders(env: Env) {
	try {
		// Find bookings that have reached end_at and haven't been returned
		const now = new Date().toISOString();
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

		// Get bookings that ended in the last hour (to avoid duplicate reminders)
		const bookings = await env.DB.prepare(
			`SELECT b.*, u.email as user_email, t.name as tool_name
			FROM bookings b
			LEFT JOIN users u ON b.user_id = u.id
			LEFT JOIN tools t ON b.tool_id = t.id
			WHERE b.end_at <= ?
			AND b.end_at >= ?
			AND b.status = 'active'
			AND (b.return_status IS NULL OR b.return_status = 'pending')`,
		)
			.bind(now, oneHourAgo)
			.all<Booking & { user_email?: string; tool_name?: string }>();

		const reminders = [];

		for (const booking of bookings.results || []) {
			if (!booking.user_email) {
				console.warn(`No email found for booking ${booking.id}`);
				continue;
			}

			// Send email reminder
			if (env.EMAIL_SERVICE) {
				const emailResponse = await env.EMAIL_SERVICE.fetch(
					new Request("https://email-service/send", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							to: booking.user_email,
							subject: `Return Reminder: ${booking.tool_name || "Your Rental"}`,
							template: "return-reminder",
							data: {
								booking_id: booking.id,
								tool_name: booking.tool_name,
								end_at: booking.end_at,
								return_url: `https://rentbox.ee/bookings/${booking.id}/return`,
							},
						}),
					}),
				);

				if (emailResponse.ok) {
					reminders.push({
						booking_id: booking.id,
						email: booking.user_email,
						sent: true,
					});
				} else {
					console.error(
						`Failed to send reminder for booking ${booking.id}`,
						await emailResponse.text(),
					);
				}
			} else {
				// Log reminder if email service not configured
				console.log(`Would send reminder for booking ${booking.id} to ${booking.user_email}`);
				reminders.push({
					booking_id: booking.id,
					email: booking.user_email,
					sent: false,
				});
			}
		}

		return {
			success: true,
			reminders_sent: reminders.filter((r) => r.sent).length,
			total_bookings: bookings.results?.length || 0,
		};
	} catch (error) {
		console.error("Error sending return reminders:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// For Cloudflare Workers Cron Trigger
export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(sendReturnReminders(env));
	},
};
