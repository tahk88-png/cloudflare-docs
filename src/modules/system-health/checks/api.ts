/**
 * API Availability Health Check
 */

import { HealthStatus } from "../types";
import { BaseHealthCheck } from "./base";
import { ServiceType } from "../types";

export class ApiHealthCheck extends BaseHealthCheck {
	private apiUrl: string;
	private healthEndpoint: string;

	constructor(apiUrl: string, healthEndpoint: string = "/health") {
		super(ServiceType.API, 3000);
		this.apiUrl = apiUrl;
		this.healthEndpoint = healthEndpoint;
	}

	async check() {
		const startTime = Date.now();
		try {
			const response = await this.withTimeout(
				fetch(`${this.apiUrl}${this.healthEndpoint}`, {
					method: "GET",
					headers: {
						"User-Agent": "Rentbox-Health-Check/1.0",
					},
					signal: AbortSignal.timeout(this.timeout),
				}),
				this.timeout,
			);

			const responseTime = Date.now() - startTime;

			if (response.ok) {
				const data = await response.json().catch(() => ({}));
				return this.createHealthResult(
					HealthStatus.OK,
					responseTime,
					undefined,
					{ statusCode: response.status, ...data },
				);
			}

			// Non-2xx but service is responding
			return this.createHealthResult(
				HealthStatus.DEGRADED,
				responseTime,
				`API returned status ${response.status}`,
				{ statusCode: response.status },
			);
		} catch (error) {
			const responseTime = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Timeout or network error = DOWN
			return this.createHealthResult(
				HealthStatus.DOWN,
				responseTime,
				errorMessage,
			);
		}
	}
}
