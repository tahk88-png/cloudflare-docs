/**
 * API Routes for System Health
 */

import {
	SystemHealth,
	AdminHealthDashboard,
	ServiceType,
	HealthStatus,
} from "../types";
import { SystemHealthMonitor } from "../index";
import { IncidentManager } from "../incidents";
import { AlertManager } from "../alerting";

export interface HealthApiContext {
	monitor: SystemHealthMonitor;
	incidentManager: IncidentManager;
	alertManager: AlertManager;
}

/**
 * GET /api/system/health
 * Public health endpoint
 */
export async function getSystemHealth(
	context: HealthApiContext,
): Promise<Response> {
	try {
		const result = await context.monitor.checkHealth();

		// Public endpoint - minimal information
		const publicHealth: SystemHealth = {
			overallStatus: result.overallStatus,
			services: result.services.map((s) => ({
				service: s.service,
				status: s.status,
				lastChecked: s.lastChecked,
				// Don't expose error details or metadata in public endpoint
			})),
			errorRates: [], // Don't expose error rates publicly
			timestamp: result.timestamp,
		};

		return new Response(JSON.stringify(publicHealth), {
			status: result.overallStatus === HealthStatus.DOWN ? 503 : 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache",
			},
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Health check failed",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

/**
 * GET /api/admin/system/health
 * Admin health dashboard endpoint
 */
export async function getAdminHealthDashboard(
	context: HealthApiContext,
): Promise<Response> {
	try {
		const result = await context.monitor.checkHealth();

		// Get incidents
		const incidents = context.incidentManager.getRecentIncidents(50);

		// Get alerts
		const recentAlerts = context.alertManager.getRecentAlerts(50);

		// Calculate uptime (simplified - would need historical data in production)
		const uptime = calculateUptime(result.services, incidents);

		const dashboard: AdminHealthDashboard = {
			systemHealth: result,
			incidents,
			recentAlerts,
			uptime,
		};

		return new Response(JSON.stringify(dashboard), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache",
			},
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Failed to generate health dashboard",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

/**
 * POST /api/admin/system/health/alerts/:id/acknowledge
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
	context: HealthApiContext,
	alertId: string,
	acknowledgedBy: string,
): Promise<Response> {
	try {
		context.alertManager.acknowledgeAlert(alertId, acknowledgedBy);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Alert acknowledged",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Failed to acknowledge alert",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

function calculateUptime(
	services: Array<{ service: ServiceType; status: HealthStatus }>,
	incidents: Array<{ startedAt: Date; resolvedAt?: Date }>,
): {
	overall: number;
	byService: Record<ServiceType, number>;
} {
	// Simplified uptime calculation
	// In production, this would use historical data from a time-series database
	const now = Date.now();
	const last24Hours = 24 * 60 * 60 * 1000;

	const byService: Record<ServiceType, number> = {} as Record<
		ServiceType,
		number
	>;

	// Initialize all services to 100%
	Object.values(ServiceType).forEach((service) => {
		byService[service] = 100;
	});

	// Calculate downtime from incidents
	incidents.forEach((incident) => {
		const startTime = incident.startedAt.getTime();
		const endTime = incident.resolvedAt?.getTime() || now;
		const windowStart = now - last24Hours;

		if (endTime > windowStart) {
			const incidentStart = Math.max(startTime, windowStart);
			const incidentEnd = Math.min(endTime, now);
			const downtime = incidentEnd - incidentStart;
			const downtimePercent = (downtime / last24Hours) * 100;

			// This is a simplified calculation - would need service type from incident
			// For now, we'll use current service status
		}
	});

	// Adjust based on current status
	services.forEach((service) => {
		if (service.status === HealthStatus.DOWN) {
			byService[service.service] = 0;
		} else if (service.status === HealthStatus.DEGRADED) {
			byService[service.service] = 95; // Assume 5% degradation
		}
	});

	// Calculate overall uptime
	const overall =
		Object.values(byService).reduce((sum, uptime) => sum + uptime, 0) /
		Object.keys(byService).length;

	return {
		overall: Math.round(overall * 100) / 100,
		byService,
	};
}
