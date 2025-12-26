/**
 * SMS Provider Health Check
 */

import { HealthStatus } from "../types";
import { BaseHealthCheck } from "./base";
import { ServiceType } from "../types";

export interface SmsProvider {
	ping?(): Promise<boolean>;
	getBalance?(): Promise<{ balance: number; currency: string }>;
	sendTestMessage?(): Promise<{ success: boolean; messageId?: string }>;
}

export class SmsProviderHealthCheck extends BaseHealthCheck {
	private provider: SmsProvider;
	private apiKey?: string;

	constructor(provider: SmsProvider, apiKey?: string, timeout: number = 5000) {
		super(ServiceType.SMS_PROVIDER, timeout);
		this.provider = provider;
		this.apiKey = apiKey;
	}

	async check() {
		const startTime = Date.now();
		try {
			// Try ping if available
			if (this.provider.ping) {
				const pingResult = await this.withTimeout(
					this.provider.ping(),
					this.timeout,
				);
				if (!pingResult) {
					return this.createHealthResult(
						HealthStatus.DEGRADED,
						Date.now() - startTime,
						"SMS provider ping failed",
					);
				}
			}

			// Check balance if available (indicates service availability)
			if (this.provider.getBalance) {
				const balanceResult = await this.withTimeout(
					this.provider.getBalance(),
					this.timeout,
				);

				const responseTime = Date.now() - startTime;

				// Low balance might indicate degraded service
				if (balanceResult.balance < 0) {
					return this.createHealthResult(
						HealthStatus.DEGRADED,
						responseTime,
						"SMS provider has negative balance",
						{ balance: balanceResult.balance },
					);
				}

				return this.createHealthResult(
					HealthStatus.OK,
					responseTime,
					undefined,
					{ balance: balanceResult.balance, currency: balanceResult.currency },
				);
			}

			// Fallback: assume OK if no specific checks available
			return this.createHealthResult(
				HealthStatus.OK,
				Date.now() - startTime,
				undefined,
				{ note: "No specific health check available" },
			);
		} catch (error) {
			const responseTime = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : "SMS provider check failed";

			return this.createHealthResult(
				HealthStatus.DOWN,
				responseTime,
				errorMessage,
			);
		}
	}
}
