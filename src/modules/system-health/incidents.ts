/**
 * Incident Tracking and Management
 */

import { Incident, ServiceType, HealthStatus, ServiceHealth } from "./types";

export class IncidentManager {
	private incidents: Map<string, Incident>;
	private activeIncidents: Map<ServiceType, Incident>;

	constructor() {
		this.incidents = new Map();
		this.activeIncidents = new Map();
	}

	createOrUpdateIncident(
		service: ServiceType,
		status: HealthStatus,
		description: string,
		error?: string,
	): Incident {
		const existing = this.activeIncidents.get(service);

		if (existing) {
			// Update existing incident
			if (status === HealthStatus.OK) {
				// Resolve incident
				existing.resolvedAt = new Date();
				existing.status = HealthStatus.OK;
				this.activeIncidents.delete(service);
			} else {
				// Update severity if needed
				if (
					status === HealthStatus.DOWN &&
					existing.severity === "degraded"
				) {
					existing.severity = "down";
					existing.description = description;
					existing.error = error;
				}
			}
			return existing;
		}

		// Create new incident
		if (status === HealthStatus.OK) {
			// No incident needed for OK status
			throw new Error("Cannot create incident for OK status");
		}

		const incident: Incident = {
			id: this.generateIncidentId(),
			service,
			status,
			startedAt: new Date(),
			severity: status === HealthStatus.DOWN ? "down" : "degraded",
			description,
			error,
		};

		this.incidents.set(incident.id, incident);
		this.activeIncidents.set(service, incident);

		return incident;
	}

	getActiveIncidents(): Incident[] {
		return Array.from(this.activeIncidents.values());
	}

	getIncident(id: string): Incident | undefined {
		return this.incidents.get(id);
	}

	getIncidentsByService(service: ServiceType): Incident[] {
		return Array.from(this.incidents.values()).filter(
			(i) => i.service === service,
		);
	}

	getRecentIncidents(limit: number = 10): Incident[] {
		return Array.from(this.incidents.values())
			.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
			.slice(0, limit);
	}

	processHealthResults(services: ServiceHealth[]): Incident[] {
		const newIncidents: Incident[] = [];

		services.forEach((service) => {
			if (service.status === HealthStatus.OK) {
				// Check if there's an active incident to resolve
				const active = this.activeIncidents.get(service.service);
				if (active) {
					active.resolvedAt = new Date();
					active.status = HealthStatus.OK;
					this.activeIncidents.delete(service.service);
				}
			} else {
				// Create or update incident
				const incident = this.createOrUpdateIncident(
					service.service,
					service.status,
					`${service.service} is ${service.status.toLowerCase()}`,
					service.error,
				);
				newIncidents.push(incident);
			}
		});

		return newIncidents;
	}

	private generateIncidentId(): string {
		return `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}
