/**
 * SMS Channel Provider
 * Uses Twilio or Cloudflare SMS (if available)
 */

import type { ChannelResult, NotificationPayload } from "../types.js";
import { EVENT_TEMPLATES } from "../types.js";

export interface SMSConfig {
	accountSid?: string;
	authToken?: string;
	fromNumber: string;
	provider?: "twilio" | "cloudflare";
}

export class SMSChannel {
	private config: SMSConfig;

	constructor(config: SMSConfig) {
		this.config = config;
	}

	async send(
		payload: NotificationPayload,
		env: Env,
	): Promise<ChannelResult> {
		const template = EVENT_TEMPLATES[payload.event];
		const recipient = payload.recipient.phone;

		if (!recipient) {
			return {
				success: false,
				error: "No phone number provided",
			};
		}

		const body = template.smsBody(payload.data);

		try {
			// Try Twilio first (most common)
			if (this.config.provider === "twilio" || !this.config.provider) {
				return await this.sendViaTwilio(recipient, body, env);
			}

			// Cloudflare SMS (if available)
			if (this.config.provider === "cloudflare") {
				return await this.sendViaCloudflare(recipient, body, env);
			}

			// Default to Twilio
			return await this.sendViaTwilio(recipient, body, env);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	private async sendViaTwilio(
		to: string,
		body: string,
		env: Env,
	): Promise<ChannelResult> {
		const accountSid =
			this.config.accountSid || env.TWILIO_ACCOUNT_SID || "";
		const authToken = this.config.authToken || env.TWILIO_AUTH_TOKEN || "";
		const fromNumber = this.config.fromNumber || env.TWILIO_FROM_NUMBER || "";

		if (!accountSid || !authToken || !fromNumber) {
			return {
				success: false,
				error: "Twilio credentials not configured",
			};
		}

		// Normalize phone number (remove spaces, ensure + prefix)
		const normalizedTo = this.normalizePhoneNumber(to);

		const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

		const formData = new URLSearchParams();
		formData.append("From", fromNumber);
		formData.append("To", normalizedTo);
		formData.append("Body", body);

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData.toString(),
		});

		if (!response.ok) {
			const error = await response.text();
			return {
				success: false,
				error: `Twilio error: ${error}`,
			};
		}

		const result = await response.json();
		return {
			success: true,
			messageId: result.sid,
			metadata: {
				provider: "twilio",
				status: result.status,
				...result,
			},
		};
	}

	private async sendViaCloudflare(
		to: string,
		body: string,
		env: Env,
	): Promise<ChannelResult> {
		// Cloudflare SMS API (if available)
		// This is a placeholder for future Cloudflare SMS integration
		if (env.SMS_WORKER) {
			const response = await env.SMS_WORKER.fetch(
				new Request("https://sms.workers.dev/send", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						to,
						body,
					}),
				}),
			);

			if (!response.ok) {
				const error = await response.text();
				return {
					success: false,
					error: `Cloudflare SMS error: ${error}`,
				};
			}

			const result = await response.json();
			return {
				success: true,
				messageId: result.messageId,
				metadata: {
					provider: "cloudflare",
					...result,
				},
			};
		}

		return {
			success: false,
			error: "Cloudflare SMS not configured",
		};
	}

	private normalizePhoneNumber(phone: string): string {
		// Remove all non-digit characters except +
		let normalized = phone.replace(/[^\d+]/g, "");

		// Ensure it starts with +
		if (!normalized.startsWith("+")) {
			// Assume Estonian number if no country code
			if (normalized.startsWith("372")) {
				normalized = "+" + normalized;
			} else if (normalized.length === 8) {
				// Estonian mobile number format
				normalized = "+372" + normalized;
			} else {
				normalized = "+" + normalized;
			}
		}

		return normalized;
	}
}
