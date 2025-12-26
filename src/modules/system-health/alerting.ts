/**
 * Alerting System
 * Threshold-based alerts with escalation rules
 */

import {
	Alert,
	AlertRule,
	ServiceHealth,
	ErrorRate,
	HealthStatus,
	ServiceType,
} from "./types";

export interface AlertChannel {
	send(alert: Alert): Promise<void>;
}

export interface SmsChannel extends AlertChannel {
	sendSms(phoneNumber: string, message: string): Promise<void>;
}

export interface EmailChannel extends AlertChannel {
	sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export class AlertManager {
	private rules: Map<ServiceType, AlertRule>;
	private alerts: Map<string, Alert>;
	private channels: Map<string, AlertChannel>;
	private adminPhoneNumber?: string;
	private adminEmail?: string;

	constructor() {
		this.rules = new Map();
		this.alerts = new Map();
		this.channels = new Map();
	}

	registerRule(rule: AlertRule): void {
		this.rules.set(rule.service, rule);
	}

	registerChannel(name: string, channel: AlertChannel): void {
		this.channels.set(name, channel);
	}

	setAdminContacts(phoneNumber?: string, email?: string): void {
		this.adminPhoneNumber = phoneNumber;
		this.adminEmail = email;
	}

	async processHealthResults(
		services: ServiceHealth[],
		errorRates: ErrorRate[],
	): Promise<Alert[]> {
		const newAlerts: Alert[] = [];

		for (const service of services) {
			const rule = this.rules.get(service.service);
			if (!rule) continue;

			// Check thresholds
			const errorRate = errorRates.find((er) => er.service === service.service);
			const shouldAlert = this.shouldAlert(service, errorRate, rule);

			if (shouldAlert) {
				const alert = await this.createAlert(service, errorRate, rule);
				if (alert) {
					newAlerts.push(alert);
					await this.sendAlert(alert, rule);
				}
			}
		}

		return newAlerts;
	}

	private shouldAlert(
		service: ServiceHealth,
		errorRate: ErrorRate | undefined,
		rule: AlertRule,
	): boolean {
		// Check error rate threshold
		if (rule.threshold.errorRate && errorRate) {
			if (errorRate.window15min >= rule.threshold.errorRate) {
				return true;
			}
		}

		// Check response time threshold
		if (rule.threshold.responseTime && service.responseTime) {
			if (service.responseTime >= rule.threshold.responseTime) {
				return true;
			}
		}

		// Check status-based alerts
		if (service.status === HealthStatus.DEGRADED && rule.onDegraded.notifyAdmin) {
			return true;
		}

		if (service.status === HealthStatus.DOWN && rule.onDown.escalate) {
			return true;
		}

		return false;
	}

	private async createAlert(
		service: ServiceHealth,
		errorRate: ErrorRate | undefined,
		rule: AlertRule,
	): Promise<Alert | null> {
		// Check if alert already exists and is not acknowledged
		const existingAlert = Array.from(this.alerts.values()).find(
			(a) =>
				a.service === service.service &&
				a.severity ===
					(service.status === HealthStatus.DOWN ? "down" : "degraded") &&
				!a.acknowledged,
		);

		if (existingAlert) {
			return null; // Don't create duplicate alerts
		}

		const severity =
			service.status === HealthStatus.DOWN ? "down" : "degraded";
		const message = this.buildAlertMessage(service, errorRate, severity);

		const alert: Alert = {
			id: this.generateAlertId(),
			service: service.service,
			severity,
			message,
			timestamp: new Date(),
			acknowledged: false,
		};

		this.alerts.set(alert.id, alert);
		return alert;
	}

	private buildAlertMessage(
		service: ServiceHealth,
		errorRate: ErrorRate | undefined,
		severity: "degraded" | "down",
	): string {
		let message = `${service.service} is ${severity.toUpperCase()}`;

		if (service.error) {
			message += `: ${service.error}`;
		}

		if (service.responseTime) {
			message += ` (Response time: ${service.responseTime}ms)`;
		}

		if (errorRate) {
			message += ` (Error rate: ${errorRate.window15min.toFixed(2)}/min)`;
		}

		return message;
	}

	private async sendAlert(alert: Alert, rule: AlertRule): Promise<void> {
		if (alert.severity === "degraded" && rule.onDegraded.notifyAdmin) {
			// Notify admin via configured channels
			if (rule.onDegraded.channels) {
				for (const channelName of rule.onDegraded.channels) {
					const channel = this.channels.get(channelName);
					if (channel) {
						await channel.send(alert).catch((err) =>
							console.error(`Failed to send alert via ${channelName}:`, err),
						);
					}
				}
			}

			// Default email notification
			if (this.adminEmail) {
				const emailChannel = this.channels.get("email");
				if (emailChannel) {
					await emailChannel
						.send(alert)
						.catch((err) =>
							console.error("Failed to send email alert:", err),
						);
				}
			}
		}

		if (alert.severity === "down" && rule.onDown.escalate) {
			// Escalate: SMS + other channels
			if (rule.onDown.sms && this.adminPhoneNumber) {
				const smsChannel = this.channels.get("sms");
				if (smsChannel && "sendSms" in smsChannel) {
					await (smsChannel as SmsChannel)
						.sendSms(this.adminPhoneNumber, alert.message)
						.catch((err) =>
							console.error("Failed to send SMS alert:", err),
						);
				}
			}

			// Send to all configured channels
			if (rule.onDown.channels) {
				for (const channelName of rule.onDown.channels) {
					const channel = this.channels.get(channelName);
					if (channel) {
						await channel.send(alert).catch((err) =>
							console.error(`Failed to send alert via ${channelName}:`, err),
						);
					}
				}
			}

			// Default email notification
			if (this.adminEmail) {
				const emailChannel = this.channels.get("email");
				if (emailChannel) {
					await emailChannel
						.send(alert)
						.catch((err) =>
							console.error("Failed to send email alert:", err),
						);
				}
			}
		}
	}

	getActiveAlerts(): Alert[] {
		return Array.from(this.alerts.values()).filter((a) => !a.acknowledged);
	}

	getRecentAlerts(limit: number = 20): Alert[] {
		return Array.from(this.alerts.values())
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, limit);
	}

	acknowledgeAlert(id: string, acknowledgedBy: string): void {
		const alert = this.alerts.get(id);
		if (alert) {
			alert.acknowledged = true;
			alert.acknowledgedAt = new Date();
			alert.acknowledgedBy = acknowledgedBy;
		}
	}

	private generateAlertId(): string {
		return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}
