/**
 * Email Channel Provider
 * Uses Cloudflare Email Workers or SendGrid/Mailgun
 */

import type { ChannelResult, NotificationPayload } from "../types.js";
import { EVENT_TEMPLATES } from "../types.js";

export interface EmailConfig {
	apiKey?: string;
	fromEmail: string;
	fromName: string;
	provider?: "cloudflare" | "sendgrid" | "mailgun";
}

export class EmailChannel {
	private config: EmailConfig;

	constructor(config: EmailConfig) {
		this.config = config;
	}

	async send(
		payload: NotificationPayload,
		env: Env,
	): Promise<ChannelResult> {
		const template = EVENT_TEMPLATES[payload.event];
		const recipient = payload.recipient.email;

		if (!recipient) {
			return {
				success: false,
				error: "No email address provided",
			};
		}

		const subject = template.subject;
		const body = template.emailBody(payload.data);

		try {
			// Try Cloudflare Email Workers first (if available)
			if (this.config.provider === "cloudflare" || !this.config.provider) {
				return await this.sendViaCloudflare(recipient, subject, body, env);
			}

			// Fallback to SendGrid
			if (this.config.provider === "sendgrid") {
				return await this.sendViaSendGrid(recipient, subject, body);
			}

			// Fallback to Mailgun
			if (this.config.provider === "mailgun") {
				return await this.sendViaMailgun(recipient, subject, body);
			}

			// Default: Use Cloudflare Email Workers
			return await this.sendViaCloudflare(recipient, subject, body, env);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	private async sendViaCloudflare(
		to: string,
		subject: string,
		body: string,
		env: Env,
	): Promise<ChannelResult> {
		// Cloudflare Email Workers API
		// Note: This requires Email Workers to be configured
		const emailRequest = {
			to: [to],
			from: `${this.config.fromName} <${this.config.fromEmail}>`,
			subject,
			text: body,
			html: this.textToHtml(body),
		};

		// If Email Workers binding is available, use it
		if (env.EMAIL_WORKER) {
			const response = await env.EMAIL_WORKER.fetch(
				new Request("https://email.workers.dev/send", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(emailRequest),
				}),
			);

			if (!response.ok) {
				const error = await response.text();
				return {
					success: false,
					error: `Email Workers error: ${error}`,
				};
			}

			const result = await response.json();
			return {
				success: true,
				messageId: result.messageId,
				metadata: result,
			};
		}

		// Fallback: Use SendGrid if configured
		if (env.SENDGRID_API_KEY) {
			return await this.sendViaSendGrid(to, subject, body);
		}

		// Last resort: Log that email would be sent
		console.log("Email would be sent:", { to, subject, body });
		return {
			success: false,
			error: "No email provider configured",
		};
	}

	private async sendViaSendGrid(
		to: string,
		subject: string,
		body: string,
	): Promise<ChannelResult> {
		const apiKey = this.config.apiKey || "";
		const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				personalizations: [
					{
						to: [{ email: to }],
					},
				],
				from: {
					email: this.config.fromEmail,
					name: this.config.fromName,
				},
				subject,
				content: [
					{
						type: "text/plain",
						value: body,
					},
					{
						type: "text/html",
						value: this.textToHtml(body),
					},
				],
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			return {
				success: false,
				error: `SendGrid error: ${error}`,
			};
		}

		const messageId = response.headers.get("x-message-id") || undefined;
		return {
			success: true,
			messageId,
			metadata: {
				provider: "sendgrid",
			},
		};
	}

	private async sendViaMailgun(
		to: string,
		subject: string,
		body: string,
	): Promise<ChannelResult> {
		const apiKey = this.config.apiKey || "";
		const domain = this.config.fromEmail.split("@")[1] || "mg.rentbox.ee";

		const formData = new FormData();
		formData.append("from", `${this.config.fromName} <${this.config.fromEmail}>`);
		formData.append("to", to);
		formData.append("subject", subject);
		formData.append("text", body);
		formData.append("html", this.textToHtml(body));

		const response = await fetch(
			`https://api.mailgun.net/v3/${domain}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
				},
				body: formData,
			},
		);

		if (!response.ok) {
			const error = await response.text();
			return {
				success: false,
				error: `Mailgun error: ${error}`,
			};
		}

		const result = await response.json();
		return {
			success: true,
			messageId: result.id,
			metadata: {
				provider: "mailgun",
				...result,
			},
		};
	}

	private textToHtml(text: string): string {
		// Simple text to HTML conversion
		return text
			.replace(/\n/g, "<br>")
			.replace(
				/(https?:\/\/[^\s]+)/g,
				'<a href="$1" target="_blank">$1</a>',
			);
	}
}
