/**
 * Database Health Check
 */

import { HealthStatus } from "../types";
import { BaseHealthCheck } from "./base";
import { ServiceType } from "../types";

export interface DatabaseConnection {
	query(sql: string, params?: unknown[]): Promise<unknown>;
	ping?(): Promise<boolean>;
	close?(): Promise<void>;
}

export class DatabaseHealthCheck extends BaseHealthCheck {
	private connection: DatabaseConnection;
	private testQuery: string;

	constructor(
		connection: DatabaseConnection,
		testQuery: string = "SELECT 1",
		timeout: number = 5000,
	) {
		super(ServiceType.DATABASE, timeout);
		this.connection = connection;
		this.testQuery = testQuery;
	}

	async check() {
		const startTime = Date.now();
		try {
			// Try ping first if available
			if (this.connection.ping) {
				await this.withTimeout(
					this.connection.ping(),
					this.timeout,
				);
			}

			// Execute test query
			const result = await this.withTimeout(
				this.connection.query(this.testQuery),
				this.timeout,
			);

			const responseTime = Date.now() - startTime;

			// Check response time thresholds
			let status = HealthStatus.OK;
			if (responseTime > 2000) {
				status = HealthStatus.DEGRADED;
			}

			return this.createHealthResult(
				status,
				responseTime,
				undefined,
				{ queryResult: result },
			);
		} catch (error) {
			const responseTime = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : "Database connection failed";

			// Connection errors = DOWN
			return this.createHealthResult(
				HealthStatus.DOWN,
				responseTime,
				errorMessage,
			);
		}
	}
}
