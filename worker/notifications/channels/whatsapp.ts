/**
 * WhatsApp Channel Provider
 * Uses Twilio WhatsApp API
 */

import type { ChannelResult, NotificationPayload } from "../types.js";
import { EVENT_TEMPLATES } from "../types.js";

export interface WhatsAppConfig {
	accountSid?: string;
	authToken?: string;
	fromNumber: string; // WhatsApp Business Number (format: whatsapp:+1234567890)
	provider?: "twilio";
}

export class WhatsAppChannel {
	private config: WhatsAppConfig;

	constructor(config: WhatsAppConfig) {
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

		const body = template.whatsappBody(payload.data);

		try {
			// Twilio WhatsApp API
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
		let fromNumber =
			this.config.fromNumber || env.TWILIO_WHATSAPP_FROM || "";

		if (!accountSid || !authToken || !fromNumber) {
			return {
				success: false,
				error: "Twilio WhatsApp credentials not configured",
			};
		}

		// Ensure WhatsApp format
		if (!fromNumber.startsWith("whatsapp:")) {
			fromNumber = `whatsapp:${fromNumber}`;
		}

		// Normalize recipient phone number
		const normalizedTo = this.normalizePhoneNumber(to);
		const whatsappTo = normalizedTo.startsWith("whatsapp:")
			? normalizedTo
			: `whatsapp:${normalizedTo}`;

		const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

		const formData = new URLSearchParams();
		formData.append("From", fromNumber);
		formData.append("To", whatsappTo);
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
				error: `Twilio WhatsApp error: ${error}`,
			};
		}

		const result = await response.json();
		return {
			success: true,
			messageId: result.sid,
			metadata: {
				provider: "twilio-whatsapp",
				status: result.status,
				...result,
			},
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
