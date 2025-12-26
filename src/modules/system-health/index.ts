/**
 * System Health & Monitoring Module
 * Main entry point and factory
 */

export * from "./types";
export * from "./orchestrator";
export * from "./incidents";
export * from "./alerting";
export * from "./checks/base";
export * from "./checks/api";
export * from "./checks/database";
export * from "./checks/payment";
export * from "./checks/sms";
export * from "./checks/email";
export * from "./checks/locker";

import { HealthOrchestrator } from "./orchestrator";
import { IncidentManager } from "./incidents";
import { AlertManager } from "./alerting";
import { HealthCheckConfig, AlertRule } from "./types";

export class SystemHealthMonitor {
	private orchestrator: HealthOrchestrator;
	private incidentManager: IncidentManager;
	private alertManager: AlertManager;

	constructor(config: HealthCheckConfig) {
		this.orchestrator = new HealthOrchestrator(config);
		this.incidentManager = new IncidentManager();
		this.alertManager = new AlertManager();

		// Register alert rules from config
		config.alertRules.forEach((rule) => {
			this.alertManager.registerRule(rule);
		});
	}

	getOrchestrator(): HealthOrchestrator {
		return this.orchestrator;
	}

	getIncidentManager(): IncidentManager {
		return this.incidentManager;
	}

	getAlertManager(): AlertManager {
		return this.alertManager;
	}

	async checkHealth() {
		const systemHealth = await this.orchestrator.runAllChecks();

		// Process incidents
		const newIncidents = this.incidentManager.processHealthResults(
			systemHealth.services,
		);

		// Process alerts
		const newAlerts = await this.alertManager.processHealthResults(
			systemHealth.services,
			systemHealth.errorRates,
		);

		return {
			...systemHealth,
			newIncidents,
			newAlerts,
		};
	}
}
