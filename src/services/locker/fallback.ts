/**
 * Fallback access methods (PIN/SMS)
 * Used when hardware fails but access is still needed
 */

import type { FallbackMethod } from "./types";

export interface FallbackAccess {
	generatePin(lockerId: string, bookingId: string): Promise<string>;
	sendSms(phoneNumber: string, pin: string, lockerId: string): Promise<boolean>;
	validatePin(lockerId: string, pin: string, bookingId: string): Promise<boolean>;
}

export interface FallbackConfig {
	smsProvider?: {
		apiKey: string;
		endpoint: string;
	};
	pinLength: number;
	pinExpiryMinutes: number;
}

const DEFAULT_CONFIG: FallbackConfig = {
	pinLength: 6,
	pinExpiryMinutes: 15,
};

/**
 * Fallback access service for PIN and SMS-based locker access
 */
export class FallbackAccessService implements FallbackAccess {
	private pinStore = new Map<string, { pin: string; expiresAt: Date; bookingId: string }>();

	constructor(private config: FallbackConfig = DEFAULT_CONFIG) {}

	async generatePin(
		lockerId: string,
		bookingId: string,
	): Promise<string> {
		// Generate random PIN
		const pin = this.generateRandomPin(this.config.pinLength);
		const expiresAt = new Date(
			Date.now() + this.config.pinExpiryMinutes * 60 * 1000,
		);

		// Store PIN with expiration
		this.pinStore.set(`${lockerId}:${bookingId}`, {
			pin,
			expiresAt,
			bookingId,
		});

		return pin;
	}

	async sendSms(
		phoneNumber: string,
		pin: string,
		lockerId: string,
	): Promise<boolean> {
		if (!this.config.smsProvider) {
			// In production, this should always have a provider configured
			console.warn("SMS provider not configured");
			return false;
		}

		try {
			const response = await fetch(this.config.smsProvider.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.config.smsProvider.apiKey}`,
				},
				body: JSON.stringify({
					to: phoneNumber,
					message: `Your Rentbox.ee locker ${lockerId} PIN: ${pin}. Valid for ${this.config.pinExpiryMinutes} minutes.`,
				}),
			});

			return response.ok;
		} catch (error) {
			console.error("Failed to send SMS:", error);
			return false;
		}
	}

	async validatePin(
		lockerId: string,
		pin: string,
		bookingId: string,
	): Promise<boolean> {
		const key = `${lockerId}:${bookingId}`;
		const stored = this.pinStore.get(key);

		if (!stored) {
			return false;
		}

		// Check expiration
		if (new Date() > stored.expiresAt) {
			this.pinStore.delete(key);
			return false;
		}

		// Validate PIN
		if (stored.pin !== pin) {
			return false;
		}

		// PIN is valid - remove it (one-time use)
		this.pinStore.delete(key);
		return true;
	}

	private generateRandomPin(length: number): string {
		const digits = "0123456789";
		let pin = "";

		for (let i = 0; i < length; i++) {
			pin += digits.charAt(Math.floor(Math.random() * digits.length));
		}

		return pin;
	}

	/**
	 * Get PIN for a locker/booking (for testing/admin purposes)
	 */
	getPin(lockerId: string, bookingId: string): string | null {
		const key = `${lockerId}:${bookingId}`;
		const stored = this.pinStore.get(key);

		if (!stored || new Date() > stored.expiresAt) {
			return null;
		}

		return stored.pin;
	}
}
