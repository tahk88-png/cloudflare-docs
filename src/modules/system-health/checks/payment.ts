/**
 * Payment Provider Health Check
 */

import { HealthStatus } from "../types";
import { BaseHealthCheck } from "./base";
import { ServiceType } from "../types";

export interface PaymentProvider {
	ping?(): Promise<boolean>;
	getStatus?(): Promise<{ status: string; latency?: number }>;
	processTestTransaction?(): Promise<{ success: boolean; latency: number }>;
}

export class PaymentProviderHealthCheck extends BaseHealthCheck {
	private provider: PaymentProvider;
	private apiKey?: string;

	constructor(provider: PaymentProvider, apiKey?: string, timeout: number = 5000) {
		super(ServiceType.PAYMENT_PROVIDER, timeout);
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
						"Payment provider ping failed",
					);
				}
			}

			// Try status check if available
			if (this.provider.getStatus) {
				const statusResult = await this.withTimeout(
					this.provider.getStatus(),
					this.timeout,
				);

				const responseTime = Date.now() - startTime;
				const status = statusResult.status?.toLowerCase();

				if (status === "ok" || status === "operational") {
					return this.createHealthResult(
						HealthStatus.OK,
						responseTime,
						undefined,
						{ providerStatus: statusResult.status },
					);
				}

				return this.createHealthResult(
					HealthStatus.DEGRADED,
					responseTime,
					`Payment provider status: ${statusResult.status}`,
					{ providerStatus: statusResult.status },
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
				error instanceof Error
					? error.message
					: "Payment provider check failed";

			return this.createHealthResult(
				HealthStatus.DOWN,
				responseTime,
				errorMessage,
			);
		}
	}
}
