/**
 * Hardware control service for physical lockers
 * Handles retry logic, timeouts, and hardware communication
 */

import type { HardwareResponse, LockerAction } from "./types";

export interface HardwareController {
	executeAction(
		lockerId: string,
		action: LockerAction,
		timeout?: number,
	): Promise<HardwareResponse>;
}

export interface HardwareConfig {
	maxRetries: number;
	retryDelay: number;
	timeout: number;
	hardwareEndpoint?: string;
}

const DEFAULT_CONFIG: HardwareConfig = {
	maxRetries: 3,
	retryDelay: 1000, // 1 second
	timeout: 5000, // 5 seconds
};

/**
 * Hardware controller with retry logic and timeout handling
 */
export class LockerHardwareController implements HardwareController {
	constructor(private config: HardwareConfig = DEFAULT_CONFIG) {}

	async executeAction(
		lockerId: string,
		action: LockerAction,
		timeout = this.config.timeout,
	): Promise<HardwareResponse> {
		let lastError: Error | null = null;
		let retryCount = 0;

		while (retryCount <= this.config.maxRetries) {
			try {
				const result = await this.executeWithTimeout(
					lockerId,
					action,
					timeout,
				);

				if (result.success) {
					return result;
				}

				// If hardware error, retry
				if (result.error && !result.timeout) {
					lastError = new Error(result.error);
					retryCount++;

					if (retryCount <= this.config.maxRetries) {
						await this.delay(this.config.retryDelay * retryCount);
						continue;
					}
				}

				return result;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				retryCount++;

				if (retryCount <= this.config.maxRetries) {
					await this.delay(this.config.retryDelay * retryCount);
				}
			}
		}

		return {
			success: false,
			locker_id: lockerId,
			error: lastError?.message || "Hardware operation failed after retries",
		};
	}

	private async executeWithTimeout(
		lockerId: string,
		action: LockerAction,
		timeout: number,
	): Promise<HardwareResponse> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const result = await this.sendHardwareCommand(lockerId, action, {
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			return result;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof Error && error.name === "AbortError") {
				return {
					success: false,
					locker_id: lockerId,
					timeout: true,
					error: "Hardware operation timed out",
				};
			}

			throw error;
		}
	}

	/**
	 * Send command to physical locker hardware
	 * This is a placeholder - replace with actual hardware API integration
	 */
	private async sendHardwareCommand(
		lockerId: string,
		action: LockerAction,
		options?: { signal?: AbortSignal },
	): Promise<HardwareResponse> {
		// Simulate hardware communication
		// In production, this would call the actual hardware API/device

		if (this.config.hardwareEndpoint) {
			try {
				const response = await fetch(
					`${this.config.hardwareEndpoint}/lockers/${lockerId}/${action}`,
					{
						method: "POST",
						signal: options?.signal,
						headers: {
							"Content-Type": "application/json",
						},
					},
				);

				if (!response.ok) {
					return {
						success: false,
						locker_id: lockerId,
						error: `Hardware API returned ${response.status}`,
					};
				}

				const data = await response.json();
				return {
					success: data.success || false,
					locker_id: lockerId,
					error: data.error,
				};
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					throw error;
				}

				return {
					success: false,
					locker_id: lockerId,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		// Fallback: Simulate hardware response
		// In production, remove this and always use hardware endpoint
		await this.delay(100 + Math.random() * 200);

		// Simulate occasional hardware failures (10% failure rate)
		if (Math.random() < 0.1) {
			return {
				success: false,
				locker_id: lockerId,
				error: "Hardware communication error",
			};
		}

		return {
			success: true,
			locker_id: lockerId,
		};
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
