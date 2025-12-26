/**
 * Example usage of the Notification Engine
 * This file demonstrates how to use the notification API
 */

// Example: Send booking confirmation
export async function sendBookingConfirmation(
	recipientEmail: string,
	recipientName: string,
	bookingId: string,
	startTime: string,
) {
	const response = await fetch("/api/notifications/send", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			event: "booking_confirmed",
			recipient: {
				email: recipientEmail,
				name: recipientName,
			},
			channels: ["email"],
			priority: "transactional",
			data: {
				bookingId,
				startTime,
			},
			bookingId,
		}),
	});

	return response.json();
}

// Example: Send urgent reminder (30 min before start)
export async function sendUrgentReminder(
	recipientEmail: string,
	recipientPhone: string,
	bookingId: string,
	startTime: string,
) {
	const response = await fetch("/api/notifications/send", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			event: "30_min_before_start",
			recipient: {
				email: recipientEmail,
				phone: recipientPhone,
			},
			channels: ["email", "sms"], // SMS will be sent automatically for urgent events
			priority: "transactional",
			data: {
				bookingId,
				startTime,
			},
			bookingId,
		}),
	});

	return response.json();
}

// Example: Send overdue warning
export async function sendOverdueWarning(
	recipientEmail: string,
	recipientPhone: string,
	bookingId: string,
	rentalId: string,
) {
	const response = await fetch("/api/notifications/send", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			event: "overdue_warning",
			recipient: {
				email: recipientEmail,
				phone: recipientPhone,
			},
			channels: ["email", "sms"], // SMS for urgent events
			priority: "transactional",
			data: {
				bookingId,
				rentalId,
			},
			bookingId,
			rentalId,
		}),
	});

	return response.json();
}

// Example: Get notification logs
export async function getNotificationLogs(
	adminApiKey: string,
	options?: {
		limit?: number;
		offset?: number;
		event?: string;
		status?: string;
		bookingId?: string;
	},
) {
	const params = new URLSearchParams();
	if (options?.limit) params.append("limit", options.limit.toString());
	if (options?.offset) params.append("offset", options.offset.toString());
	if (options?.event) params.append("event", options.event);
	if (options?.status) params.append("status", options.status);
	if (options?.bookingId) params.append("bookingId", options.bookingId);

	const response = await fetch(
		`/api/admin/notifications/logs?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${adminApiKey}`,
			},
		},
	);

	return response.json();
}
