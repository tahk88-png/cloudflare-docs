/**
 * Example Usage of System Health & Monitoring Module
 * This file demonstrates how to integrate and use the health monitoring system
 */

import {
	SystemHealthMonitor,
	HealthCheckConfig,
	AlertRule,
	ServiceType,
} from "./index";
import { ApiHealthCheck } from "./checks/api";
import { DatabaseHealthCheck } from "./checks/database";
import { PaymentProviderHealthCheck } from "./checks/payment";
import { SmsProviderHealthCheck } from "./checks/sms";
import { EmailProviderHealthCheck } from "./checks/email";
import { LockerAccessHealthCheck } from "./checks/locker";
import { AlertChannel, SmsChannel } from "./alerting";

// Example: Setting up health monitoring in a Cloudflare Worker
export async function setupHealthMonitoring(env: {
	API_URL: string;
	DB: D1Database;
	PAYMENT_API_URL: string;
	SMS_API_URL: string;
	EMAIL_API_URL: string;
	LOCKER_API_URL: string;
	ADMIN_PHONE?: string;
	ADMIN_EMAIL?: string;
}) {
	// 1. Create alert rules
	const alertRules: AlertRule[] = [
		{
			id: "api-alert",
			service: ServiceType.API,
			threshold: {
				errorRate: 5, // 5 errors per minute
				responseTime: 3000, // 3 seconds
			},
			onDegraded: {
				notifyAdmin: true,
				channels: ["email"],
			},
			onDown: {
				escalate: true,
				sms: true,
				channels: ["email", "sms"],
			},
		},
		{
			id: "database-alert",
			service: ServiceType.DATABASE,
			threshold: {
				errorRate: 3,
				responseTime: 2000,
			},
			onDegraded: {
				notifyAdmin: true,
				channels: ["email"],
			},
			onDown: {
				escalate: true,
				sms: true,
				channels: ["email", "sms"],
			},
		},
		// Add more rules for other services...
	];

	// 2. Create configuration
	const config: HealthCheckConfig = {
		timeout: 5000, // 5 seconds
		retries: 2,
		interval: 60000, // Check every minute
		alertRules,
	};

	// 3. Initialize monitor
	const monitor = new SystemHealthMonitor(config);

	// 4. Register health checks
	// API check
	monitor.getOrchestrator().registerCheck(
		new ApiHealthCheck(env.API_URL, "/health"),
	);

	// Database check
	const dbConnection = {
		query: async (sql: string, params?: unknown[]) => {
			return env.DB.prepare(sql).bind(...(params || [])).all();
		},
		ping: async () => {
			try {
				await env.DB.prepare("SELECT 1").first();
				return true;
			} catch {
				return false;
			}
		},
	};
	monitor.getOrchestrator().registerCheck(
		new DatabaseHealthCheck(dbConnection),
	);

	// Payment provider check
	const paymentProvider = {
		ping: async () => {
			const response = await fetch(`${env.PAYMENT_API_URL}/ping`);
			return response.ok;
		},
		getStatus: async () => {
			const response = await fetch(`${env.PAYMENT_API_URL}/status`);
			return response.json();
		},
	};
	monitor.getOrchestrator().registerCheck(
		new PaymentProviderHealthCheck(paymentProvider),
	);

	// SMS provider check
	const smsProvider = {
		ping: async () => {
			const response = await fetch(`${env.SMS_API_URL}/ping`);
			return response.ok;
		},
		getBalance: async () => {
			const response = await fetch(`${env.SMS_API_URL}/balance`);
			return response.json();
		},
	};
	monitor.getOrchestrator().registerCheck(
		new SmsProviderHealthCheck(smsProvider),
	);

	// Email provider check
	const emailProvider = {
		ping: async () => {
			const response = await fetch(`${env.EMAIL_API_URL}/ping`);
			return response.ok;
		},
		getStatus: async () => {
			const response = await fetch(`${env.EMAIL_API_URL}/status`);
			return response.json();
		},
	};
	monitor.getOrchestrator().registerCheck(
		new EmailProviderHealthCheck(emailProvider),
	);

	// Locker access check
	const lockerService = {
		ping: async () => {
			const response = await fetch(`${env.LOCKER_API_URL}/ping`);
			return response.ok;
		},
		testConnection: async () => {
			const startTime = Date.now();
			const response = await fetch(`${env.LOCKER_API_URL}/test`);
			const latency = Date.now() - startTime;
			return {
				success: response.ok,
				latency,
			};
		},
		getStatus: async () => {
			const response = await fetch(`${env.LOCKER_API_URL}/status`);
			return response.json();
		},
	};
	monitor.getOrchestrator().registerCheck(
		new LockerAccessHealthCheck(lockerService),
	);

	// 5. Register alert channels
	const emailChannel: AlertChannel = {
		send: async (alert) => {
			// Implement email sending logic
			console.log(`Sending email alert: ${alert.message}`);
			// await sendEmail({
			//   to: env.ADMIN_EMAIL,
			//   subject: `Alert: ${alert.service} is ${alert.severity}`,
			//   body: alert.message,
			// });
		},
	};

	const smsChannel: SmsChannel = {
		send: async (alert) => {
			// Implement SMS sending logic
			console.log(`Sending SMS alert: ${alert.message}`);
		},
		sendSms: async (phoneNumber: string, message: string) => {
			// Implement SMS sending logic
			console.log(`Sending SMS to ${phoneNumber}: ${message}`);
			// await sendSMS(phoneNumber, message);
		},
	};

	monitor.getAlertManager().registerChannel("email", emailChannel);
	monitor.getAlertManager().registerChannel("sms", smsChannel);

	// 6. Set admin contacts
	if (env.ADMIN_PHONE || env.ADMIN_EMAIL) {
		monitor.getAlertManager().setAdminContacts(
			env.ADMIN_PHONE,
			env.ADMIN_EMAIL,
		);
	}

	return monitor;
}

// Example: Running health checks periodically
export async function runPeriodicHealthChecks(monitor: SystemHealthMonitor) {
	const result = await monitor.checkHealth();

	console.log("Overall Status:", result.overallStatus);
	console.log("Services:", result.services);
	console.log("Error Rates:", result.errorRates);
	console.log("New Incidents:", result.newIncidents);
	console.log("New Alerts:", result.newAlerts);

	// Handle incidents
	if (result.newIncidents.length > 0) {
		console.log("New incidents detected:", result.newIncidents);
		// Log to incident management system, create tickets, etc.
	}

	// Handle alerts
	if (result.newAlerts.length > 0) {
		console.log("New alerts:", result.newAlerts);
		// Alerts are automatically sent via registered channels
	}

	return result;
}

// Example: Handling health check API requests
export async function handleHealthCheckRequest(
	request: Request,
	monitor: SystemHealthMonitor,
): Promise<Response> {
	const url = new URL(request.url);

	if (url.pathname === "/api/system/health" && request.method === "GET") {
		const result = await monitor.checkHealth();

		// Public endpoint - minimal information
		return new Response(
			JSON.stringify({
				overallStatus: result.overallStatus,
				services: result.services.map((s) => ({
					service: s.service,
					status: s.status,
					lastChecked: s.lastChecked,
				})),
				timestamp: result.timestamp,
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	if (
		url.pathname === "/api/admin/system/health" &&
		request.method === "GET"
	) {
		// Add authentication check here
		const result = await monitor.checkHealth();
		const incidents = monitor.getIncidentManager().getRecentIncidents(50);
		const alerts = monitor.getAlertManager().getRecentAlerts(50);

		return new Response(
			JSON.stringify({
				systemHealth: result,
				incidents,
				recentAlerts: alerts,
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	return new Response("Not Found", { status: 404 });
}

// Example: Using in a Cloudflare Worker scheduled event
export async function scheduledHealthCheck(
	event: ScheduledEvent,
	env: { [key: string]: unknown },
	ctx: ExecutionContext,
) {
	const monitor = await setupHealthMonitoring(env as any);
	await runPeriodicHealthChecks(monitor);
}
