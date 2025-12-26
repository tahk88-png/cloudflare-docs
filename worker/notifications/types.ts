/**
 * Notification Engine Types for Rentbox.ee
 */

export type NotificationChannel = "email" | "sms" | "whatsapp";

export type NotificationEvent =
	| "booking_confirmed"
	| "30_min_before_start"
	| "rental_started"
	| "15_min_before_end"
	| "overdue_warning"
	| "return_confirmed";

export type NotificationPriority = "transactional" | "marketing";

export type NotificationStatus =
	| "pending"
	| "sent"
	| "failed"
	| "retrying"
	| "delivered"
	| "bounced";

export interface NotificationRecipient {
	email?: string;
	phone?: string;
	name?: string;
}

export interface NotificationPayload {
	event: NotificationEvent;
	recipient: NotificationRecipient;
	channels: NotificationChannel[];
	priority: NotificationPriority;
	data: Record<string, unknown>;
	bookingId?: string;
	rentalId?: string;
}

export interface NotificationLog {
	id: string;
	event: NotificationEvent;
	channel: NotificationChannel;
	recipient: string; // email or phone
	status: NotificationStatus;
	priority: NotificationPriority;
	bookingId?: string;
	rentalId?: string;
	attempts: number;
	lastAttemptAt: string;
	createdAt: string;
	sentAt?: string;
	deliveredAt?: string;
	error?: string;
	metadata?: Record<string, unknown>;
}

export interface ChannelResult {
	success: boolean;
	messageId?: string;
	error?: string;
	metadata?: Record<string, unknown>;
}

export interface NotificationResult {
	channel: NotificationChannel;
	result: ChannelResult;
}

// Event urgency mapping - determines if SMS should be used
export const URGENT_EVENTS: NotificationEvent[] = [
	"30_min_before_start",
	"15_min_before_end",
	"overdue_warning",
];

// Event templates mapping
export const EVENT_TEMPLATES: Record<
	NotificationEvent,
	{
		subject: string;
		emailBody: (data: Record<string, unknown>) => string;
		smsBody: (data: Record<string, unknown>) => string;
		whatsappBody: (data: Record<string, unknown>) => string;
	}
> = {
	booking_confirmed: {
		subject: "Booking Confirmed - Rentbox.ee",
		emailBody: (data) =>
			`Your booking has been confirmed! Booking ID: ${data.bookingId || "N/A"}. Start: ${data.startTime || "N/A"}.`,
		smsBody: (data) =>
			`Booking confirmed! ID: ${data.bookingId || "N/A"}. Start: ${data.startTime || "N/A"}. Rentbox.ee`,
		whatsappBody: (data) =>
			`✅ *Booking Confirmed*\n\nBooking ID: ${data.bookingId || "N/A"}\nStart Time: ${data.startTime || "N/A"}\n\nThank you for using Rentbox.ee!`,
	},
	"30_min_before_start": {
		subject: "Reminder: Your Rental Starts in 30 Minutes",
		emailBody: (data) =>
			`Your rental starts in 30 minutes! Booking ID: ${data.bookingId || "N/A"}. Please arrive on time.`,
		smsBody: (data) =>
			`URGENT: Rental starts in 30 min! Booking: ${data.bookingId || "N/A"}. Rentbox.ee`,
		whatsappBody: (data) =>
			`⏰ *Reminder: Rental Starts Soon*\n\nYour rental starts in 30 minutes!\nBooking ID: ${data.bookingId || "N/A"}\n\nPlease arrive on time.`,
	},
	rental_started: {
		subject: "Your Rental Has Started - Rentbox.ee",
		emailBody: (data) =>
			`Your rental has started! Booking ID: ${data.bookingId || "N/A"}. Enjoy your rental!`,
		smsBody: (data) =>
			`Rental started! Booking: ${data.bookingId || "N/A"}. Rentbox.ee`,
		whatsappBody: (data) =>
			`🚀 *Rental Started*\n\nYour rental has begun!\nBooking ID: ${data.bookingId || "N/A"}\n\nEnjoy your rental!`,
	},
	"15_min_before_end": {
		subject: "Reminder: Your Rental Ends in 15 Minutes",
		emailBody: (data) =>
			`Your rental ends in 15 minutes! Booking ID: ${data.bookingId || "N/A"}. Please prepare to return.`,
		smsBody: (data) =>
			`URGENT: Rental ends in 15 min! Booking: ${data.bookingId || "N/A"}. Return soon! Rentbox.ee`,
		whatsappBody: (data) =>
			`⏰ *Return Reminder*\n\nYour rental ends in 15 minutes!\nBooking ID: ${data.bookingId || "N/A"}\n\nPlease prepare to return.`,
	},
	overdue_warning: {
		subject: "URGENT: Rental Overdue - Rentbox.ee",
		emailBody: (data) =>
			`Your rental is overdue! Booking ID: ${data.bookingId || "N/A"}. Please return immediately to avoid additional charges.`,
		smsBody: (data) =>
			`URGENT: Rental OVERDUE! Booking: ${data.bookingId || "N/A"}. Return NOW! Rentbox.ee`,
		whatsappBody: (data) =>
			`🚨 *URGENT: Rental Overdue*\n\nYour rental is overdue!\nBooking ID: ${data.bookingId || "N/A"}\n\nPlease return immediately to avoid additional charges.`,
	},
	return_confirmed: {
		subject: "Return Confirmed - Rentbox.ee",
		emailBody: (data) =>
			`Your return has been confirmed! Booking ID: ${data.bookingId || "N/A"}. Thank you for using Rentbox.ee!`,
		smsBody: (data) =>
			`Return confirmed! Booking: ${data.bookingId || "N/A"}. Thanks! Rentbox.ee`,
		whatsappBody: (data) =>
			`✅ *Return Confirmed*\n\nYour return has been confirmed!\nBooking ID: ${data.bookingId || "N/A"}\n\nThank you for using Rentbox.ee!`,
	},
};
