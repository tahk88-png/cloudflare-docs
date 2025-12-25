import { dbAll, dbGet, isoNow } from "./db";
import { problem } from "./http";
import { sha256Hex, randomTokenUrlSafe } from "./crypto";
import { renderTemplate } from "./templates";
import { writeAudit } from "./service";

type ProviderResult =
	| { ok: true; provider: string; message_id?: string }
	| { ok: false; provider: string; error: string };

async function sendViaMailChannels(params: {
	from: string;
	replyTo: string;
	to: string;
	subject: string;
	html: string;
	text?: string | null;
}) : Promise<ProviderResult> {
	const payload: any = {
		personalizations: [{ to: [{ email: params.to }] }],
		from: { email: params.from },
		reply_to: { email: params.replyTo },
		subject: params.subject,
		content: [{ type: "text/html", value: params.html }],
	};
	if (params.text) payload.content.push({ type: "text/plain", value: params.text });

	const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const t = await res.text().catch(() => "");
		return { ok: false, provider: "mailchannels", error: `HTTP ${res.status} ${t}`.slice(0, 1500) };
	}
	return { ok: true, provider: "mailchannels" };
}

async function sendEmail(env: Env, params: {
	from: string;
	replyTo: string;
	to: string;
	subject: string;
	html: string;
	text?: string | null;
}): Promise<ProviderResult> {
	const provider = (env.EMAIL_PROVIDER ?? "stub").toLowerCase();
	if (provider === "mailchannels") return await sendViaMailChannels(params);
	// Default stub for local/tests: treat as sent.
	return { ok: true, provider: "stub", message_id: "stub" };
}

function computeNextAttempt(attempt: number) {
	const base = 60; // 1 minute
	const max = 60 * 60; // 1 hour
	const delay = Math.min(max, base * Math.pow(2, Math.max(0, attempt)));
	return new Date(Date.now() + delay * 1000).toISOString();
}

export async function processEmailQueue(env: Env, limit = 20) {
	const now = isoNow();
	const jobs = await dbAll<any>(
		env.INVOICING_DB,
		"SELECT id, tenant_id, invoice_id, kind, to_email, from_email, reply_to, subject, body_html, body_text, state, attempt_count FROM email_logs WHERE state = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?) ORDER BY queued_at ASC LIMIT ?",
		[now, limit],
	);
	let processed = 0;

	for (const job of jobs) {
		// Claim job
		const claim = await env.INVOICING_DB.prepare(
			"UPDATE email_logs SET state = 'sending', sending_at = ? WHERE id = ? AND state = 'queued'",
		).bind(now, String(job.id)).run();
		if ((claim.meta?.changes ?? 0) !== 1) continue;

		const result = await sendEmail(env, {
			from: String(job.from_email),
			replyTo: String(job.reply_to),
			to: String(job.to_email),
			subject: String(job.subject),
			html: String(job.body_html),
			text: job.body_text ? String(job.body_text) : null,
		}).catch((e) => ({ ok: false, provider: "unknown", error: (e as Error).message } as ProviderResult));

		if (result.ok) {
			await env.INVOICING_DB.prepare(
				"UPDATE email_logs SET state = 'sent', provider = ?, provider_message_id = ?, sent_at = ?, last_error = NULL WHERE id = ?",
			).bind(result.provider, result.message_id ?? null, isoNow(), String(job.id)).run();

			await writeAudit({
				env,
				ctx: null,
				tenantId: String(job.tenant_id),
				action: "email.sent",
				entity_type: "email_log",
				entity_id: String(job.id),
				data: { kind: job.kind, provider: result.provider, invoice_id: job.invoice_id },
			});
		} else {
			const attempt = Number(job.attempt_count ?? 0) + 1;
			const maxAttempts = Number(env.EMAIL_MAX_ATTEMPTS ?? 8);
			if (attempt >= maxAttempts) {
				await env.INVOICING_DB.prepare(
					"UPDATE email_logs SET state = 'failed', attempt_count = ?, last_error = ?, failed_at = ? WHERE id = ?",
				).bind(attempt, result.error.slice(0, 1500), isoNow(), String(job.id)).run();
				await writeAudit({
					env,
					ctx: null,
					tenantId: String(job.tenant_id),
					action: "email.failed",
					entity_type: "email_log",
					entity_id: String(job.id),
					data: { kind: job.kind, provider: result.provider, invoice_id: job.invoice_id },
				});
			} else {
				await env.INVOICING_DB.prepare(
					"UPDATE email_logs SET state = 'queued', attempt_count = ?, last_error = ?, next_attempt_at = ? WHERE id = ?",
				).bind(attempt, result.error.slice(0, 1500), computeNextAttempt(attempt), String(job.id)).run();
			}
		}

		processed++;
	}

	return { processed };
}

export async function enqueueReminderIfDue(params: {
	env: Env;
	tenantId: string;
	invoiceId: string;
	scheduledFor: string;
}) {
	// Create a fresh view token per reminder for time-limited access.
	const now = isoNow();
	const inv = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT i.id, i.tenant_id, i.customer_id, i.number, i.status, i.pdf_r2_key, i.pdf_sha256 FROM invoices i WHERE i.id = ? AND i.tenant_id = ? LIMIT 1",
		[params.invoiceId, params.tenantId],
	);
	if (!inv?.number || !inv?.pdf_sha256) return problem(409, "Invoice not ready for reminder");

	const customer = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT name, email FROM customers WHERE id = ? AND tenant_id = ? LIMIT 1",
		[String(inv.customer_id), params.tenantId],
	);
	if (!customer?.email) return problem(400, "Customer email missing");

	const tpl = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT subject, body_html, body_text FROM templates WHERE tenant_id = ? AND kind = 'reminder_email' AND is_default = 1 ORDER BY updated_at DESC LIMIT 1",
		[params.tenantId],
	);

	const tokenPlain = randomTokenUrlSafe(32);
	const tokenHash = await sha256Hex(tokenPlain);
	const tokenTtlSeconds = Number(params.env.VIEW_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7);
	const expiresAt = new Date(Date.now() + tokenTtlSeconds * 1000).toISOString();
	const tokenId = crypto.randomUUID();
	const viewUrl = `${(params.env.APP_BASE_URL ?? "").trim() || "https://example.invalid"}/invoice-view/${tokenPlain}`;

	const subjectTpl = tpl?.subject ?? "Payment reminder: {{invoice_number}}";
	const bodyHtmlTpl =
		tpl?.body_html ??
		"<p>Hello {{customer_name}},</p><p>Reminder for invoice {{invoice_number}}: <a href=\"{{view_url}}\">View invoice</a></p>";
	const bodyTextTpl =
		tpl?.body_text ??
		"Hello {{customer_name}},\n\nReminder for invoice {{invoice_number}}: {{view_url}}\n";

	const vars = {
		customer_name: String(customer.name ?? "Customer"),
		invoice_number: String(inv.number),
		view_url: viewUrl,
	};
	const subject = renderTemplate(subjectTpl, vars);
	const bodyHtml = renderTemplate(bodyHtmlTpl, vars);
	const bodyText = bodyTextTpl ? renderTemplate(bodyTextTpl, vars) : null;

	const fromEmail = params.env.EMAIL_FROM ?? "no-reply@domain";
	const replyTo = params.env.EMAIL_REPLY_TO ?? "support@domain";
	const emailId = crypto.randomUUID();

	await params.env.INVOICING_DB.batch([
		params.env.INVOICING_DB.prepare(
			"INSERT INTO invoice_view_tokens (id, tenant_id, invoice_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		).bind(tokenId, params.tenantId, params.invoiceId, tokenHash, expiresAt, now),
		params.env.INVOICING_DB.prepare(
			"INSERT INTO email_logs (id, tenant_id, invoice_id, kind, to_email, from_email, reply_to, subject, body_html, body_text, state, attempt_count, queued_at, next_attempt_at) VALUES (?, ?, ?, 'reminder', ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)",
		).bind(
			emailId,
			params.tenantId,
			params.invoiceId,
			String(customer.email),
			fromEmail,
			replyTo,
			subject,
			bodyHtml,
			bodyText,
			now,
			now,
		),
		params.env.INVOICING_DB.prepare(
			"INSERT INTO reminder_sends (id, tenant_id, invoice_id, email_log_id, scheduled_for, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		).bind(
			crypto.randomUUID(),
			params.tenantId,
			params.invoiceId,
			emailId,
			params.scheduledFor,
			now,
		),
	]);

	await writeAudit({
		env: params.env,
		ctx: null,
		tenantId: params.tenantId,
		action: "reminder.queued",
		entity_type: "invoice",
		entity_id: params.invoiceId,
		data: { email_log_id: emailId, scheduled_for: params.scheduledFor },
	});

	return { ok: true, email_log_id: emailId };
}

