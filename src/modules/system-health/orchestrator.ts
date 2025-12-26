/**
 * Health Check Orchestrator
 * Coordinates all health checks and aggregates results
 */

import {
	HealthStatus,
	ServiceHealth,
	ServiceType,
	SystemHealth,
	ErrorRate,
	HealthCheckConfig,
} from "./types";
import { HealthCheck } from "./checks/base";

export class HealthOrchestrator {
	private checks: Map<ServiceType, HealthCheck>;
	private config: HealthCheckConfig;
	private errorHistory: Map<
		ServiceType,
		Array<{ timestamp: Date; error: boolean }>
	>;

	constructor(config: HealthCheckConfig) {
		this.config = config;
		this.checks = new Map();
		this.errorHistory = new Map();
	}

	registerCheck(check: HealthCheck): void {
		this.checks.set(check.getServiceType(), check);
		if (!this.errorHistory.has(check.getServiceType())) {
			this.errorHistory.set(check.getServiceType(), []);
		}
	}

	async runAllChecks(): Promise<SystemHealth> {
		const checkPromises = Array.from(this.checks.values()).map((check) =>
			check.check().catch((error) => ({
				service: check.getServiceType(),
				status: HealthStatus.DOWN,
				lastChecked: new Date(),
				error: error instanceof Error ? error.message : "Unknown error",
			})),
		);

		const results = await Promise.all(checkPromises);
		const services = results as ServiceHealth[];

		// Update error history
		const now = new Date();
		services.forEach((service) => {
			const history = this.errorHistory.get(service.service) || [];
			history.push({
				timestamp: now,
				error: service.status !== HealthStatus.OK,
			});

			// Keep only last 60 minutes of history
			const cutoff = new Date(now.getTime() - 60 * 60 * 1000);
			const filtered = history.filter((h) => h.timestamp >= cutoff);
			this.errorHistory.set(service.service, filtered);
		});

		// Calculate error rates
		const errorRates = this.calculateErrorRates();

		// Determine overall status
		const overallStatus = this.determineOverallStatus(services);

		// Find last incident timestamp
		const lastIncidentTimestamp = this.findLastIncidentTimestamp(services);

		return {
			overallStatus,
			services,
			errorRates,
			lastIncidentTimestamp,
			timestamp: new Date(),
		};
	}

	private calculateErrorRates(): ErrorRate[] {
		const now = new Date();
		const window15min = new Date(now.getTime() - 15 * 60 * 1000);
		const window60min = new Date(now.getTime() - 60 * 60 * 1000);

		return Array.from(this.errorHistory.entries()).map(([service, history]) => {
			const errors15min = history.filter(
				(h) => h.timestamp >= window15min && h.error,
			).length;
			const requests15min = history.filter(
				(h) => h.timestamp >= window15min,
			).length;
			const errors60min = history.filter(
				(h) => h.timestamp >= window60min && h.error,
			).length;
			const requests60min = history.filter(
				(h) => h.timestamp >= window60min,
			).length;

			// Calculate errors per minute
			const errorRate15min =
				requests15min > 0 ? (errors15min / 15) : 0;
			const errorRate60min =
				requests60min > 0 ? (errors60min / 60) : 0;

			return {
				service,
				window15min: errorRate15min,
				window60min: errorRate60min,
				totalErrors15min: errors15min,
				totalErrors60min: errors60min,
				totalRequests15min: requests15min,
				totalRequests60min: requests60min,
			};
		});
	}

	private determineOverallStatus(services: ServiceHealth[]): HealthStatus {
		const hasDown = services.some((s) => s.status === HealthStatus.DOWN);
		if (hasDown) {
			return HealthStatus.DOWN;
		}

		const hasDegraded = services.some((s) => s.status === HealthStatus.DEGRADED);
		if (hasDegraded) {
			return HealthStatus.DEGRADED;
		}

		return HealthStatus.OK;
	}

	private findLastIncidentTimestamp(
		services: ServiceHealth[],
	): Date | undefined {
		const incidents = services
			.filter((s) => s.status !== HealthStatus.OK)
			.map((s) => s.lastChecked);

		if (incidents.length === 0) {
			return undefined;
		}

		return new Date(Math.max(...incidents.map((d) => d.getTime())));
	}

	getErrorHistory(service: ServiceType): Array<{ timestamp: Date; error: boolean }> {
		return this.errorHistory.get(service) || [];
	}
}
