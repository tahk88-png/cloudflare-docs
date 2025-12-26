/**
 * Email Provider Health Check
 */

import { HealthStatus } from "../types";
import { BaseHealthCheck } from "./base";
import { ServiceType } from "../types";

export interface EmailProvider {
	ping?(): Promise<boolean>;
	getStatus?(): Promise<{ status: string; quota?: number; used?: number }>;
	sendTestEmail?(): Promise<{ success: boolean; messageId?: string }>;
}

export class EmailProviderHealthCheck extends BaseHealthCheck {
	private provider: EmailProvider;
	private apiKey?: string;

	constructor(provider: EmailProvider, apiKey?: string, timeout: number = 5000) {
		super(ServiceType.EMAIL_PROVIDER, timeout);
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
						"Email provider ping failed",
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

				// Check quota if available
				if (
					statusResult.quota !== undefined &&
					statusResult.used !== undefined
				) {
					const quotaUsage = statusResult.used / statusResult.quota;
					if (quotaUsage > 0.95) {
						return this.createHealthResult(
							HealthStatus.DEGRADED,
							responseTime,
							`Email provider quota nearly exhausted: ${(quotaUsage * 100).toFixed(1)}%`,
							{
								providerStatus: statusResult.status,
								quota: statusResult.quota,
								used: statusResult.used,
							},
						);
					}
				}

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
					`Email provider status: ${statusResult.status}`,
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
				error instanceof Error ? error.message : "Email provider check failed";

			return this.createHealthResult(
				HealthStatus.DOWN,
				responseTime,
				errorMessage,
			);
		}
	}
}
