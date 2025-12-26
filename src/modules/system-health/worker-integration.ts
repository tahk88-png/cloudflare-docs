/**
 * Cloudflare Workers Integration for System Health Monitoring
 * Example integration showing how to set up health monitoring in a Worker
 */

import { SystemHealthMonitor, HealthCheckConfig, AlertRule, ServiceType } from "./index";
import { ApiHealthCheck } from "./checks/api";
import { DatabaseHealthCheck } from "./checks/database";
import { PaymentProviderHealthCheck } from "./checks/payment";
import { SmsProviderHealthCheck } from "./checks/sms";
import { EmailProviderHealthCheck } from "./checks/email";
import { LockerAccessHealthCheck } from "./checks/locker";
import { getSystemHealth, getAdminHealthDashboard, acknowledgeAlert, HealthApiContext } from "./api/routes";

export interface HealthMonitoringEnv {
	// Database connection (example - adjust based on your setup)
	DB?: D1Database;
	
	// API URLs
	API_URL?: string;
	PAYMENT_API_URL?: string;
	SMS_API_URL?: string;
	EMAIL_API_URL?: string;
	LOCKER_API_URL?: string;
	
	// API Keys
	PAYMENT_API_KEY?: string;
	SMS_API_KEY?: string;
	EMAIL_API_KEY?: string;
	LOCKER_API_KEY?: string;
	
	// Admin contacts
	ADMIN_PHONE?: string;
	ADMIN_EMAIL?: string;
}

/**
 * Initialize health monitoring system
 */
export function createHealthMonitor(env: HealthMonitoringEnv): SystemHealthMonitor {
	const config: HealthCheckConfig = {
		timeout: 5000,
		retries: 2,
		interval: 60000, // Check every minute
		alertRules: createDefaultAlertRules(),
	};

	const monitor = new SystemHealthMonitor(config);

	// Register health checks
	if (env.API_URL) {
		monitor.getOrchestrator().registerCheck(
			new ApiHealthCheck(env.API_URL),
		);
	}

	// Database check (example with D1)
	if (env.DB) {
		const dbConnection = {
			query: async (sql: string, params?: unknown[]) => {
				return env.DB!.prepare(sql).bind(...(params || [])).all();
			},
			ping: async () => {
				try {
					await env.DB!.prepare("SELECT 1").first();
					return true;
				} catch {
					return false;
				}
			},
		};
		monitor.getOrchestrator().registerCheck(
			new DatabaseHealthCheck(dbConnection),
		);
	}

	// Payment provider check (example - implement your provider interface)
	if (env.PAYMENT_API_URL) {
		const paymentProvider = createPaymentProvider(env.PAYMENT_API_URL, env.PAYMENT_API_KEY);
		monitor.getOrchestrator().registerCheck(
			new PaymentProviderHealthCheck(paymentProvider, env.PAYMENT_API_KEY),
		);
	}

	// SMS provider check
	if (env.SMS_API_URL) {
		const smsProvider = createSmsProvider(env.SMS_API_URL, env.SMS_API_KEY);
		monitor.getOrchestrator().registerCheck(
			new SmsProviderHealthCheck(smsProvider, env.SMS_API_KEY),
		);
	}

	// Email provider check
	if (env.EMAIL_API_URL) {
		const emailProvider = createEmailProvider(env.EMAIL_API_URL, env.EMAIL_API_KEY);
		monitor.getOrchestrator().registerCheck(
			new EmailProviderHealthCheck(emailProvider, env.EMAIL_API_KEY),
		);
	}

	// Locker access check
	if (env.LOCKER_API_URL) {
		const lockerService = createLockerService(env.LOCKER_API_URL, env.LOCKER_API_KEY);
		monitor.getOrchestrator().registerCheck(
			new LockerAccessHealthCheck(lockerService, env.LOCKER_API_KEY),
		);
	}

	// Set admin contacts for alerting
	monitor.getAlertManager().setAdminContacts(
		env.ADMIN_PHONE,
		env.ADMIN_EMAIL,
	);

	return monitor;
}

/**
 * Handle health check API requests
 */
export async function handleHealthRequest(
	request: Request,
	monitor: SystemHealthMonitor,
): Promise<Response> {
	const url = new URL(request.url);
	const pathname = url.pathname;

	// Create context
	const context: HealthApiContext = {
		monitor,
		incidentManager: monitor.getIncidentManager(),
		alertManager: monitor.getAlertManager(),
	};

	// Route requests
	if (pathname === "/api/system/health" && request.method === "GET") {
		return getSystemHealth(context);
	}

	if (pathname === "/api/admin/system/health" && request.method === "GET") {
		// In production, add authentication check here
		return getAdminHealthDashboard(context);
	}

	if (
		pathname.startsWith("/api/admin/system/health/alerts/") &&
		pathname.endsWith("/acknowledge") &&
		request.method === "POST"
	) {
		const alertId = pathname.split("/").slice(-2, -1)[0];
		const body = await request.json().catch(() => ({}));
		const acknowledgedBy = (body as { acknowledgedBy?: string }).acknowledgedBy || "admin";
		return acknowledgeAlert(context, alertId, acknowledgedBy);
	}

	return new Response("Not Found", { status: 404 });
}

function createDefaultAlertRules(): AlertRule[] {
	return [
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
		{
			id: "payment-alert",
			service: ServiceType.PAYMENT_PROVIDER,
			threshold: {
				errorRate: 2,
				responseTime: 5000,
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
			id: "sms-alert",
			service: ServiceType.SMS_PROVIDER,
			threshold: {
				errorRate: 10,
			},
			onDegraded: {
				notifyAdmin: true,
				channels: ["email"],
			},
			onDown: {
				escalate: true,
				sms: false, // Don't SMS if SMS is down
				channels: ["email"],
			},
		},
		{
			id: "email-alert",
			service: ServiceType.EMAIL_PROVIDER,
			threshold: {
				errorRate: 10,
			},
			onDegraded: {
				notifyAdmin: true,
				channels: ["slack"], // Use alternative channel
			},
			onDown: {
				escalate: true,
				sms: true,
				channels: ["sms"],
			},
		},
		{
			id: "locker-alert",
			service: ServiceType.LOCKER_ACCESS,
			threshold: {
				errorRate: 5,
				responseTime: 3000,
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
	];
}

// Example provider implementations - replace with your actual providers
function createPaymentProvider(apiUrl: string, apiKey?: string) {
	return {
		ping: async () => {
			const response = await fetch(`${apiUrl}/ping`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.ok;
		},
		getStatus: async () => {
			const response = await fetch(`${apiUrl}/status`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.json();
		},
	};
}

function createSmsProvider(apiUrl: string, apiKey?: string) {
	return {
		ping: async () => {
			const response = await fetch(`${apiUrl}/ping`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.ok;
		},
		getBalance: async () => {
			const response = await fetch(`${apiUrl}/balance`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.json();
		},
	};
}

function createEmailProvider(apiUrl: string, apiKey?: string) {
	return {
		ping: async () => {
			const response = await fetch(`${apiUrl}/ping`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.ok;
		},
		getStatus: async () => {
			const response = await fetch(`${apiUrl}/status`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.json();
		},
	};
}

function createLockerService(apiUrl: string, apiKey?: string) {
	return {
		ping: async () => {
			const response = await fetch(`${apiUrl}/ping`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.ok;
		},
		testConnection: async () => {
			const startTime = Date.now();
			const response = await fetch(`${apiUrl}/test`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			const latency = Date.now() - startTime;
			return {
				success: response.ok,
				latency,
			};
		},
		getStatus: async () => {
			const response = await fetch(`${apiUrl}/status`, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			});
			return response.json();
		},
	};
}
