/**
 * Base health check interface and utilities
 */

import { HealthStatus, ServiceHealth, ServiceType } from "../types";

export interface HealthCheck {
	check(): Promise<ServiceHealth>;
	getServiceType(): ServiceType;
}

export abstract class BaseHealthCheck implements HealthCheck {
	protected serviceType: ServiceType;
	protected timeout: number;

	constructor(serviceType: ServiceType, timeout: number = 5000) {
		this.serviceType = serviceType;
		this.timeout = timeout;
	}

	abstract check(): Promise<ServiceHealth>;
	getServiceType(): ServiceType {
		return this.serviceType;
	}

	protected async withTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
	): Promise<T> {
		return Promise.race([
			promise,
			new Promise<T>((_, reject) =>
				setTimeout(() => reject(new Error("Health check timeout")), timeoutMs),
			),
		]);
	}

	protected createHealthResult(
		status: HealthStatus,
		responseTime?: number,
		error?: string,
		metadata?: Record<string, unknown>,
	): ServiceHealth {
		return {
			service: this.serviceType,
			status,
			responseTime,
			lastChecked: new Date(),
			error,
			metadata,
		};
	}
}
