/**
 * System Health & Monitoring Module - Core Types
 * Focused on operational truth, not vanity metrics
 */

export enum HealthStatus {
	OK = "OK",
	DEGRADED = "Degraded",
	DOWN = "Down",
}

export enum ServiceType {
	API = "api",
	DATABASE = "database",
	PAYMENT_PROVIDER = "payment_provider",
	SMS_PROVIDER = "sms_provider",
	EMAIL_PROVIDER = "email_provider",
	LOCKER_ACCESS = "locker_access",
}

export interface ServiceHealth {
	service: ServiceType;
	status: HealthStatus;
	responseTime?: number; // milliseconds
	lastChecked: Date;
	error?: string;
	metadata?: Record<string, unknown>;
}

export interface ErrorRate {
	service: ServiceType;
	window15min: number; // errors per minute average
	window60min: number; // errors per minute average
	totalErrors15min: number;
	totalErrors60min: number;
	totalRequests15min: number;
	totalRequests60min: number;
}

export interface SystemHealth {
	overallStatus: HealthStatus;
	services: ServiceHealth[];
	errorRates: ErrorRate[];
	lastIncidentTimestamp?: Date;
	timestamp: Date;
}

export interface Incident {
	id: string;
	service: ServiceType;
	status: HealthStatus;
	startedAt: Date;
	resolvedAt?: Date;
	severity: "degraded" | "down";
	description: string;
	error?: string;
}

export interface AlertRule {
	id: string;
	service: ServiceType;
	threshold: {
		errorRate?: number; // errors per minute
		responseTime?: number; // milliseconds
		availability?: number; // percentage
	};
	onDegraded: {
		notifyAdmin: boolean;
		channels?: string[]; // email, slack, etc.
	};
	onDown: {
		escalate: boolean;
		sms: boolean;
		channels?: string[];
	};
}

export interface HealthCheckConfig {
	timeout: number; // milliseconds
	retries: number;
	interval: number; // milliseconds
	alertRules: AlertRule[];
}

export interface AdminHealthDashboard {
	systemHealth: SystemHealth;
	incidents: Incident[];
	recentAlerts: Alert[];
	uptime: {
		overall: number; // percentage
		byService: Record<ServiceType, number>;
	};
}

export interface Alert {
	id: string;
	service: ServiceType;
	severity: "degraded" | "down";
	message: string;
	timestamp: Date;
	acknowledged: boolean;
	acknowledgedAt?: Date;
	acknowledgedBy?: string;
}
