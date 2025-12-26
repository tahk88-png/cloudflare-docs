/**
 * Locker Access Service Health Check
 */

import { HealthStatus } from "../types";
import { BaseHealthCheck } from "./base";
import { ServiceType } from "../types";

export interface LockerAccessService {
	ping?(): Promise<boolean>;
	getStatus?(): Promise<{ status: string; connectedLockers?: number }>;
	testConnection?(): Promise<{ success: boolean; latency: number }>;
}

export class LockerAccessHealthCheck extends BaseHealthCheck {
	private service: LockerAccessService;
	private apiKey?: string;

	constructor(
		service: LockerAccessService,
		apiKey?: string,
		timeout: number = 5000,
	) {
		super(ServiceType.LOCKER_ACCESS, timeout);
		this.service = service;
		this.apiKey = apiKey;
	}

	async check() {
		const startTime = Date.now();
		try {
			// Try ping if available
			if (this.service.ping) {
				const pingResult = await this.withTimeout(
					this.service.ping(),
					this.timeout,
				);
				if (!pingResult) {
					return this.createHealthResult(
						HealthStatus.DEGRADED,
						Date.now() - startTime,
						"Locker access service ping failed",
					);
				}
			}

			// Try connection test if available
			if (this.service.testConnection) {
				const connectionResult = await this.withTimeout(
					this.service.testConnection(),
					this.timeout,
				);

				const responseTime = Date.now() - startTime;

				if (!connectionResult.success) {
					return this.createHealthResult(
						HealthStatus.DOWN,
						responseTime,
						"Locker access service connection test failed",
						{ latency: connectionResult.latency },
					);
				}

				// Check latency thresholds
				let status = HealthStatus.OK;
				if (connectionResult.latency > 2000) {
					status = HealthStatus.DEGRADED;
				}

				return this.createHealthResult(
					status,
					responseTime,
					undefined,
					{ latency: connectionResult.latency },
				);
			}

			// Try status check if available
			if (this.service.getStatus) {
				const statusResult = await this.withTimeout(
					this.service.getStatus(),
					this.timeout,
				);

				const responseTime = Date.now() - startTime;
				const status = statusResult.status?.toLowerCase();

				if (status === "ok" || status === "operational") {
					return this.createHealthResult(
						HealthStatus.OK,
						responseTime,
						undefined,
						{
							providerStatus: statusResult.status,
							connectedLockers: statusResult.connectedLockers,
						},
					);
				}

				return this.createHealthResult(
					HealthStatus.DEGRADED,
					responseTime,
					`Locker access service status: ${statusResult.status}`,
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
					: "Locker access service check failed";

			return this.createHealthResult(
				HealthStatus.DOWN,
				responseTime,
				errorMessage,
			);
		}
	}
}
