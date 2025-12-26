/**
 * Main Locker Access Service
 * Orchestrates hardware control, booking validation, fallback access, and logging
 */

import type {
	LockerAction,
	LockerControlRequest,
	LockerControlResponse,
	LockerStatus,
	LockerActionResult,
	FallbackMethod,
} from "./types";
import { Database } from "./database";
import { HardwareController } from "./hardware";
import { FallbackAccess } from "./fallback";
import { BookingService } from "./booking";

export interface LockerServiceConfig {
	database: Database;
	hardware: HardwareController;
	fallback: FallbackAccess;
	booking: BookingService;
	enableFallback: boolean;
	adminApiKey?: string;
}

export class LockerAccessService {
	constructor(private config: LockerServiceConfig) {}

	/**
	 * Open a locker
	 */
	async openLocker(
		request: LockerControlRequest,
	): Promise<LockerControlResponse> {
		return this.executeLockerAction(request, "open");
	}

	/**
	 * Close a locker
	 */
	async closeLocker(
		request: LockerControlRequest,
	): Promise<LockerControlResponse> {
		return this.executeLockerAction(request, "close");
	}

	/**
	 * Get locker status
	 */
	async getLockerStatus(lockerId: string): Promise<LockerStatus | null> {
		return this.config.database.getLockerStatus(lockerId);
	}

	/**
	 * Execute locker action with full validation and error handling
	 */
	private async executeLockerAction(
		request: LockerControlRequest,
		action: LockerAction,
	): Promise<LockerControlResponse> {
		// Validate booking (unless admin override)
		if (!request.admin_override) {
			const isActive = await this.config.booking.isBookingActive(
				request.booking_id,
				request.locker_id,
			);

			if (!isActive) {
				const event = await this.config.database.createEvent({
					locker_id: request.locker_id,
					action,
					result: "unauthorized",
					booking_id: request.booking_id,
					user_id: request.user_id,
					error_message: "Booking is not active",
				});

				return {
					success: false,
					locker_id: request.locker_id,
					action,
					result: "unauthorized",
					event_id: event.id,
					message: "Booking is not active or expired",
				};
			}
		}

		// Attempt hardware control
		const hardwareResult = await this.config.hardware.executeAction(
			request.locker_id,
			action,
		);

		let result: LockerActionResult;
		let fallbackMethod: FallbackMethod | undefined;
		let fallbackAvailable = false;

		if (hardwareResult.success) {
			result = "success";
		} else if (hardwareResult.timeout) {
			result = "timeout";
		} else {
			result = "hardware_error";
		}

		// If hardware failed and fallback is enabled, prepare fallback
		if (
			!hardwareResult.success &&
			this.config.enableFallback &&
			action === "open"
		) {
			fallbackAvailable = true;
			// Generate fallback PIN
			const pin = await this.config.fallback.generatePin(
				request.locker_id,
				request.booking_id,
			);
			fallbackMethod = "pin";

			// Log fallback generation
			await this.config.database.createEvent({
				locker_id: request.locker_id,
				action,
				result: "success", // Fallback available
				booking_id: request.booking_id,
				user_id: request.user_id,
				admin_override: request.admin_override,
				fallback_method: fallbackMethod,
			});
		}

		// Log the hardware attempt
		const event = await this.config.database.createEvent({
			locker_id: request.locker_id,
			action,
			result,
			booking_id: request.booking_id,
			user_id: request.user_id,
			admin_override: request.admin_override,
			fallback_method: fallbackMethod,
			error_message: hardwareResult.error,
			retry_count: 0, // Hardware controller handles retries internally
		});

		return {
			success: hardwareResult.success || fallbackAvailable,
			locker_id: request.locker_id,
			action,
			result: hardwareResult.success ? "success" : result,
			event_id: event.id,
			fallback_available: fallbackAvailable,
			fallback_method: fallbackMethod,
			message: hardwareResult.success
				? `${action} successful`
				: fallbackAvailable
					? `Hardware failed, fallback PIN available`
					: hardwareResult.error || "Hardware operation failed",
		};
	}

	/**
	 * Validate admin override
	 */
	isAdminRequest(apiKey?: string): boolean {
		return (
			this.config.adminApiKey !== undefined &&
			apiKey === this.config.adminApiKey
		);
	}
}
