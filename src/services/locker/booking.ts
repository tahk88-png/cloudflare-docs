/**
 * Booking validation service
 * Checks if a booking is active and authorized for locker access
 */

import type { BookingInfo } from "./types";

export interface BookingService {
	isBookingActive(bookingId: string, lockerId: string): Promise<boolean>;
	getBookingInfo(bookingId: string): Promise<BookingInfo | null>;
}

/**
 * Booking service implementation
 * In production, this would integrate with your booking system
 */
export class BookingValidationService implements BookingService {
	constructor(
		private bookingApiEndpoint?: string,
		private bookingApiKey?: string,
	) {}

	async isBookingActive(
		bookingId: string,
		lockerId: string,
	): Promise<boolean> {
		const booking = await this.getBookingInfo(bookingId);

		if (!booking) {
			return false;
		}

		// Verify locker matches
		if (booking.locker_id !== lockerId) {
			return false;
		}

		// Check if booking is active
		if (!booking.is_active) {
			return false;
		}

		// Check time window
		const now = new Date();
		if (now < booking.start_time || now > booking.end_time) {
			return false;
		}

		return true;
	}

	async getBookingInfo(bookingId: string): Promise<BookingInfo | null> {
		if (this.bookingApiEndpoint && this.bookingApiKey) {
			try {
				const response = await fetch(
					`${this.bookingApiEndpoint}/bookings/${bookingId}`,
					{
						headers: {
							Authorization: `Bearer ${this.bookingApiKey}`,
							"Content-Type": "application/json",
						},
					},
				);

				if (!response.ok) {
					return null;
				}

				const data = await response.json();
				return {
					booking_id: data.id || bookingId,
					locker_id: data.locker_id,
					user_id: data.user_id,
					start_time: new Date(data.start_time),
					end_time: new Date(data.end_time),
					is_active: data.is_active ?? true,
				};
			} catch (error) {
				console.error("Failed to fetch booking info:", error);
				return null;
			}
		}

		// Fallback: Mock booking for development
		// In production, this should always use the API
		return {
			booking_id: bookingId,
			locker_id: "locker-001", // Default locker
			user_id: "user-001",
			start_time: new Date(Date.now() - 3600000), // 1 hour ago
			end_time: new Date(Date.now() + 3600000), // 1 hour from now
			is_active: true,
		};
	}
}
