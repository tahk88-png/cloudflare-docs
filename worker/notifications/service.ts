/**
 * Notification Service
 * Handles sending notifications with retry logic and logging
 */

import type {
	NotificationChannel,
	NotificationPayload,
	NotificationResult,
	NotificationStatus,
} from "./types.js";
import { URGENT_EVENTS } from "./types.js";
import { EmailChannel } from "./channels/email.js";
import { SMSChannel } from "./channels/sms.js";
import { WhatsAppChannel } from "./channels/whatsapp.js";

export interface NotificationServiceConfig {
	email: {
		fromEmail: string;
		fromName: string;
		apiKey?: string;
		provider?: "cloudflare" | "sendgrid" | "mailgun";
	};
	sms: {
		fromNumber: string;
		accountSid?: string;
		authToken?: string;
		provider?: "twilio" | "cloudflare";
	};
	whatsapp?: {
		fromNumber: string;
		accountSid?: string;
		authToken?: string;
		provider?: "twilio";
	};
	maxRetries?: number;
	retryDelayMs?: number;
}

export class NotificationService {
	private emailChannel: EmailChannel;
	private smsChannel: SMSChannel;
	private whatsappChannel?: WhatsAppChannel;
	private maxRetries: number;
	private retryDelayMs: number;

	constructor(config: NotificationServiceConfig) {
		this.emailChannel = new EmailChannel(config.email);
		this.smsChannel = new SMSChannel(config.sms);
		if (config.whatsapp) {
			this.whatsappChannel = new WhatsAppChannel(config.whatsapp);
		}
		this.maxRetries = config.maxRetries || 3;
		this.retryDelayMs = config.retryDelayMs || 5000;
	}

	/**
	 * Determine which channels to use based on event urgency and priority
	 */
	private determineChannels(
		payload: NotificationPayload,
	): NotificationChannel[] {
		const channels: NotificationChannel[] = [];

		// Always send email for transactional messages
		if (payload.priority === "transactional") {
			channels.push("email");
		}

		// SMS for urgent events only
		if (URGENT_EVENTS.includes(payload.event)) {
			channels.push("sms");
		}

		// WhatsApp if explicitly requested and configured
		if (
			payload.channels.includes("whatsapp") &&
			this.whatsappChannel &&
			payload.priority === "transactional"
		) {
			channels.push("whatsapp");
		}

		// If no channels determined, default to email
		if (channels.length === 0) {
			channels.push("email");
		}

		return [...new Set(channels)]; // Remove duplicates
	}

	/**
	 * Send notification with retry logic
	 */
	async send(
		payload: NotificationPayload,
		env: Env,
	): Promise<NotificationResult[]> {
		const channels = this.determineChannels(payload);
		const results: NotificationResult[] = [];

		for (const channel of channels) {
			const result = await this.sendWithRetry(channel, payload, env);
			results.push(result);
		}

		return results;
	}

	/**
	 * Send notification via specific channel with retry logic
	 */
	private async sendWithRetry(
		channel: NotificationChannel,
		payload: NotificationPayload,
		env: Env,
	): Promise<NotificationResult> {
		let lastError: string | undefined;
		let attempts = 0;

		while (attempts < this.maxRetries) {
			attempts++;

			try {
				let result;

				switch (channel) {
					case "email":
						result = await this.emailChannel.send(payload, env);
						break;
					case "sms":
						result = await this.smsChannel.send(payload, env);
						break;
					case "whatsapp":
						if (!this.whatsappChannel) {
							return {
								channel,
								result: {
									success: false,
									error: "WhatsApp channel not configured",
								},
							};
						}
						result = await this.whatsappChannel.send(payload, env);
						break;
					default:
						return {
							channel,
							result: {
								success: false,
								error: `Unknown channel: ${channel}`,
							},
						};
				}

				if (result.success) {
					return {
						channel,
						result,
					};
				}

				lastError = result.error;

				// Don't retry if it's a configuration error
				if (
					lastError?.includes("not configured") ||
					lastError?.includes("credentials")
				) {
					break;
				}

				// Wait before retry (exponential backoff)
				if (attempts < this.maxRetries) {
					const delay = this.retryDelayMs * Math.pow(2, attempts - 1);
					await this.sleep(delay);
				}
			} catch (error) {
				lastError =
					error instanceof Error ? error.message : "Unknown error";

				// Don't retry on certain errors
				if (
					lastError.includes("not configured") ||
					lastError.includes("credentials")
				) {
					break;
				}

				// Wait before retry
				if (attempts < this.maxRetries) {
					const delay = this.retryDelayMs * Math.pow(2, attempts - 1);
					await this.sleep(delay);
				}
			}
		}

		return {
			channel,
			result: {
				success: false,
				error: lastError || "Max retries exceeded",
			},
		};
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
