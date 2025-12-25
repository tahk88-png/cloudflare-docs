import { dbAll, dbGet, isoNow, asJson } from "./db";
import { problem, getClientIp, getUserAgent } from "./http";
import { computeInvoiceTotals, normalizeVatRate } from "./money";
import { sha256Hex, randomTokenUrlSafe } from "./crypto";
import { generateInvoicePdf } from "./pdf";
import { renderTemplate } from "./templates";
import type {
	AuthContext,
} from "./auth";
import type {
	CustomerInput,
	InvoiceItemInput,
	InvoiceStatus,
	InvoiceType,
	ReminderConfigInput,
	VatRate,
} from "./types";

function requireString(v: unknown, name: string) {
	if (typeof v !== "string" || v.trim() === "") throw new Error(`Missing ${name}`);
	return v.trim();
}

function optionalString(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const t = v.trim();
	return t ? t : null;
}

function requireInt(v: unknown, name: string) {
	if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
		throw new Error(`Invalid ${name}`);
	}
	return v;
}

function requireNonNegInt(v: unknown, name: string) {
	const n = requireInt(v, name);
	if (n < 0) throw new Error(`Invalid ${name}`);
	return n;
}

function parseQtyMilli(item: any) {
	if (typeof item.qty_milli === "number") {
		const q = requireInt(item.qty_milli, "qty_milli");
		if (q <= 0) throw new Error("qty_milli must be > 0");
		return q;
	}
	if (typeof item.quantity === "number" && Number.isFinite(item.quantity)) {
		const q = Math.round(item.quantity * 1000);
		if (q <= 0) throw new Error("quantity must be > 0");
		return q;
	}
	throw new Error("Missing quantity (quantity or qty_milli)");
}

function parseVatRate(v: unknown): VatRate {
	if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Invalid vat_rate");
	return normalizeVatRate(v);
}

export async function writeAudit(params: {
	env: Env;
	ctx: AuthContext | null;
	tenantId: string;
	action: string;
	entity_type: string;
	entity_id: string;
	data?: unknown;
	request?: Request;
}) {
	const now = isoNow();
	const ip = params.request ? getClientIp(params.request) : null;
	const ua = params.request ? getUserAgent(params.request) : null;
	await params.env.INVOICING_DB.prepare(
		"INSERT INTO audit_logs (id, tenant_id, actor_user_id, action, entity_type, entity_id, data_json, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	).bind(
		crypto.randomUUID(),
		params.tenantId,
		params.ctx?.userId ?? null,
		params.action,
		params.entity_type,
		params.entity_id,
		params.data ? JSON.stringify(params.data) : null,
		ip,
		ua,
		now,
	).run();
}

export async function upsertCustomer(params: {
	env: Env;
	ctx: AuthContext;
	customer_id?: string | null;
	customer?: CustomerInput | null;
}) {
	if (params.customer_id) {
		const exists = await dbGet<{ id: string }>(
			params.env.INVOICING_DB,
			"SELECT id FROM customers WHERE id = ? AND tenant_id = ? LIMIT 1",
			[params.customer_id, params.ctx.tenantId],
		);
		if (!exists) throw new Error("customer_id not found");
		return params.customer_id;
	}
	if (!params.customer) throw new Error("Missing customer");
	const now = isoNow();
	const id = crypto.randomUUID();
	await params.env.INVOICING_DB.prepare(
		"INSERT INTO customers (id, tenant_id, name, email, address_json, vat_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
	).bind(
		id,
		params.ctx.tenantId,
		params.customer.name,
		params.customer.email,
		params.customer.address ? JSON.stringify(params.customer.address) : null,
		params.customer.vat_number ?? null,
		now,
		now,
	).run();
	return id;
}

export async function createInvoice(params: {
	request: Request;
	env: Env;
	ctx: AuthContext;
	body: any;
}) {
	const type: InvoiceType = params.body.type === "credit" ? "credit" : "invoice";
	const original_invoice_id =
		type === "credit" ? optionalString(params.body.original_invoice_id) : null;

	if (type === "credit") {
		if (!original_invoice_id) return problem(400, "original_invoice_id required for credit notes");
		const orig = await dbGet<{ id: string; status: InvoiceStatus; type: InvoiceType }>(
			params.env.INVOICING_DB,
			"SELECT id, status, type FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1",
			[original_invoice_id, params.ctx.tenantId],
		);
		if (!orig) return problem(400, "original_invoice_id not found");
		if (orig.type !== "invoice") return problem(400, "Cannot credit a credit note");
		if (orig.status === "draft") return problem(409, "Cannot create credit note for a draft invoice");
	}

	const customer_id = optionalString(params.body.customer_id);
	const customer = params.body.customer as CustomerInput | undefined;

	const itemsRaw = params.body.items;
	if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
		return problem(400, "items must be a non-empty array");
	}

	const items: InvoiceItemInput[] = itemsRaw.map((it: any) => ({
		description: requireString(it.description, "description"),
		qty_milli: parseQtyMilli(it),
		unit_price_cents: requireNonNegInt(it.unit_price_cents, "unit_price_cents"),
		vat_rate: parseVatRate(it.vat_rate),
	}));

	const currency = optionalString(params.body.currency) ?? "EUR";
	const issue_date = optionalString(params.body.issue_date);
	const due_date = optionalString(params.body.due_date);
	const note = optionalString(params.body.note);
	const payment_provider = optionalString(params.body.payment?.provider);
	const payment_url = optionalString(params.body.payment?.url);
	const reminders = params.body.reminders as ReminderConfigInput | undefined;

	const totals = computeInvoiceTotals(items, type);
	const now = isoNow();
	const invoiceId = crypto.randomUUID();

	let customerId: string;
	try {
		customerId = await upsertCustomer({
			env: params.env,
			ctx: params.ctx,
			customer_id,
			customer: customer
				? {
						name: requireString(customer.name, "customer.name"),
						email: requireString(customer.email, "customer.email"),
						address: customer.address,
						vat_number: customer.vat_number,
					}
				: null,
		});
	} catch (e) {
		return problem(400, (e as Error).message);
	}

	const statements: D1PreparedStatement[] = [];
	statements.push(
		params.env.INVOICING_DB.prepare(
			"INSERT INTO invoices (id, tenant_id, customer_id, type, original_invoice_id, status, currency, issue_date, due_date, payment_provider, payment_url, note, totals_json, created_by_user_id, updated_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		).bind(
			invoiceId,
			params.ctx.tenantId,
			customerId,
			type,
			original_invoice_id,
			currency,
			issue_date,
			due_date,
			payment_provider,
			payment_url,
			note,
			JSON.stringify(totals),
			params.ctx.userId,
			params.ctx.userId,
			now,
			now,
		),
	);
	for (const it of items) {
		statements.push(
			params.env.INVOICING_DB.prepare(
				"INSERT INTO invoice_items (id, invoice_id, description, qty_milli, unit_price_cents, vat_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			).bind(
				crypto.randomUUID(),
				invoiceId,
				it.description,
				it.qty_milli,
				it.unit_price_cents,
				it.vat_rate,
				now,
			),
		);
	}
	if (reminders?.days_after_sent?.length) {
		statements.push(
			params.env.INVOICING_DB.prepare(
				"INSERT INTO reminder_configs (id, tenant_id, scope_type, scope_id, days_after_sent_json, enabled, created_at, updated_at) VALUES (?, ?, 'invoice', ?, ?, 1, ?, ?)",
			).bind(
				crypto.randomUUID(),
				params.ctx.tenantId,
				invoiceId,
				JSON.stringify(reminders.days_after_sent),
				now,
				now,
			),
		);
	}

	await params.env.INVOICING_DB.batch(statements);

	await writeAudit({
		env: params.env,
		ctx: params.ctx,
		tenantId: params.ctx.tenantId,
		action: "invoice.create",
		entity_type: "invoice",
		entity_id: invoiceId,
		data: { type, original_invoice_id },
		request: params.request,
	});

	return {
		id: invoiceId,
		status: "draft" as const,
	};
}

export async function getInvoice(params: {
	env: Env;
	ctx: AuthContext;
	invoiceId: string;
}) {
	const inv = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT * FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1",
		[params.invoiceId, params.ctx.tenantId],
	);
	if (!inv) return null;
	const items = await dbAll<any>(
		params.env.INVOICING_DB,
		"SELECT description, qty_milli, unit_price_cents, vat_rate FROM invoice_items WHERE invoice_id = ? ORDER BY created_at ASC",
		[params.invoiceId],
	);
	const customer = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT id, name, email, address_json, vat_number FROM customers WHERE id = ? AND tenant_id = ? LIMIT 1",
		[inv.customer_id, params.ctx.tenantId],
	);
	const totals = asJson(inv.totals_json, {
		subtotal_cents: 0,
		vat_total_cents: 0,
		total_cents: 0,
		vat_breakdown: {},
	});
	return {
		...inv,
		totals,
		items,
		customer: customer
			? {
					...customer,
					address: asJson(customer.address_json, null),
				}
			: null,
	};
}

export async function updateInvoiceDraft(params: {
	request: Request;
	env: Env;
	ctx: AuthContext;
	invoiceId: string;
	body: any;
}) {
	const inv = await dbGet<{ status: InvoiceStatus; type: InvoiceType; customer_id: string }>(
		params.env.INVOICING_DB,
		"SELECT status, type, customer_id FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1",
		[params.invoiceId, params.ctx.tenantId],
	);
	if (!inv) return problem(404, "Invoice not found");
	if (inv.status !== "draft") return problem(409, "Only draft invoices can be edited");

	const itemsRaw = params.body.items;
	if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
		return problem(400, "items must be a non-empty array");
	}
	const items: InvoiceItemInput[] = itemsRaw.map((it: any) => ({
		description: requireString(it.description, "description"),
		qty_milli: parseQtyMilli(it),
		unit_price_cents: requireNonNegInt(it.unit_price_cents, "unit_price_cents"),
		vat_rate: parseVatRate(it.vat_rate),
	}));
	const totals = computeInvoiceTotals(items, inv.type);

	const currency = optionalString(params.body.currency);
	const issue_date = optionalString(params.body.issue_date);
	const due_date = optionalString(params.body.due_date);
	const note = optionalString(params.body.note);
	const payment_provider = optionalString(params.body.payment?.provider);
	const payment_url = optionalString(params.body.payment?.url);
	const reminders = params.body.reminders as ReminderConfigInput | undefined;

	const now = isoNow();
	const stmts: D1PreparedStatement[] = [];
	stmts.push(
		params.env.INVOICING_DB.prepare(
			"UPDATE invoices SET currency = COALESCE(?, currency), issue_date = COALESCE(?, issue_date), due_date = COALESCE(?, due_date), note = COALESCE(?, note), payment_provider = COALESCE(?, payment_provider), payment_url = COALESCE(?, payment_url), totals_json = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
		).bind(
			currency,
			issue_date,
			due_date,
			note,
			payment_provider,
			payment_url,
			JSON.stringify(totals),
			params.ctx.userId,
			now,
			params.invoiceId,
			params.ctx.tenantId,
		),
	);
	stmts.push(
		params.env.INVOICING_DB.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").bind(
			params.invoiceId,
		),
	);
	for (const it of items) {
		stmts.push(
			params.env.INVOICING_DB.prepare(
				"INSERT INTO invoice_items (id, invoice_id, description, qty_milli, unit_price_cents, vat_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			).bind(
				crypto.randomUUID(),
				params.invoiceId,
				it.description,
				it.qty_milli,
				it.unit_price_cents,
				it.vat_rate,
				now,
			),
		);
	}
	if (reminders?.days_after_sent) {
		stmts.push(
			params.env.INVOICING_DB.prepare(
				"DELETE FROM reminder_configs WHERE tenant_id = ? AND scope_type = 'invoice' AND scope_id = ?",
			).bind(params.ctx.tenantId, params.invoiceId),
		);
		if (reminders.days_after_sent.length) {
			stmts.push(
				params.env.INVOICING_DB.prepare(
					"INSERT INTO reminder_configs (id, tenant_id, scope_type, scope_id, days_after_sent_json, enabled, created_at, updated_at) VALUES (?, ?, 'invoice', ?, ?, 1, ?, ?)",
				).bind(
					crypto.randomUUID(),
					params.ctx.tenantId,
					params.invoiceId,
					JSON.stringify(reminders.days_after_sent),
					now,
					now,
				),
			);
		}
	}

	await params.env.INVOICING_DB.batch(stmts);

	await writeAudit({
		env: params.env,
		ctx: params.ctx,
		tenantId: params.ctx.tenantId,
		action: "invoice.update",
		entity_type: "invoice",
		entity_id: params.invoiceId,
		request: params.request,
	});

	return { ok: true };
}

async function allocateInvoiceNumber(params: {
	env: Env;
	tenantId: string;
	now: string;
}) {
	const year = new Date(params.now).getUTCFullYear();
	// Ensure counter row exists, then atomically increment and return allocated seq.
	await params.env.INVOICING_DB.prepare(
		"INSERT INTO invoice_counters (tenant_id, year, next_seq, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(tenant_id, year) DO NOTHING",
	).bind(params.tenantId, year, params.now).run();

	const res = await params.env.INVOICING_DB.prepare(
		"UPDATE invoice_counters SET next_seq = next_seq + 1, updated_at = ? WHERE tenant_id = ? AND year = ? RETURNING next_seq - 1 AS seq",
	).bind(params.now, params.tenantId, year).first<{ seq: number }>();
	if (!res) throw new Error("Failed to allocate invoice sequence");
	const seq = res.seq;
	const number = `${year}-${String(seq).padStart(6, "0")}`;
	return { year, seq, number };
}

async function getDefaultTemplate(params: {
	env: Env;
	tenantId: string;
	kind: "invoice_email" | "reminder_email";
}) {
	const t = await dbGet<{
		subject: string;
		body_html: string;
		body_text: string | null;
	}>(
		params.env.INVOICING_DB,
		"SELECT subject, body_html, body_text FROM templates WHERE tenant_id = ? AND kind = ? AND is_default = 1 ORDER BY updated_at DESC LIMIT 1",
		[params.tenantId, params.kind],
	);
	if (t) return t;
	// Safe fallback
	return {
		subject: params.kind === "invoice_email" ? "Your invoice" : "Payment reminder",
		body_html:
			"<p>Hello {{customer_name}},</p><p><a href=\"{{view_url}}\">View invoice</a></p>",
		body_text: "Hello {{customer_name}},\n\nView invoice: {{view_url}}\n",
	};
}

export async function generateDraftPdf(params: {
	env: Env;
	ctx: AuthContext;
	invoiceId: string;
}) {
	const data = await getInvoice({ env: params.env, ctx: params.ctx, invoiceId: params.invoiceId });
	if (!data) return null;
	const invoice = {
		id: data.id as string,
		type: data.type as InvoiceType,
		status: data.status as InvoiceStatus,
		number: data.number ? String(data.number) : null,
		currency: data.currency as string,
		issue_date: data.issue_date ? String(data.issue_date) : null,
		due_date: data.due_date ? String(data.due_date) : null,
		payment_url: data.payment_url ? String(data.payment_url) : null,
		totals: data.totals,
	};
	const customer = {
		name: data.customer?.name ?? "Customer",
		email: data.customer?.email ?? "unknown@example.com",
		address: data.customer?.address ?? null,
		vat_number: data.customer?.vat_number ?? null,
	};
	const items = (data.items ?? []).map((it: any) => ({
		description: String(it.description),
		qty_milli: Number(it.qty_milli),
		unit_price_cents: Number(it.unit_price_cents),
		vat_rate: Number(it.vat_rate) as VatRate,
	}));
	const bytes = await generateInvoicePdf({ invoice, customer, items, mode: "draft" });
	return bytes;
}

export async function finalizeAndQueueInvoiceEmail(params: {
	request: Request;
	env: Env;
	ctx: AuthContext;
	invoiceId: string;
}) {
	const inv = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT id, tenant_id, customer_id, status, type, number, pdf_sha256, pdf_r2_key, payment_url, currency, issue_date, due_date, totals_json FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1",
		[params.invoiceId, params.ctx.tenantId],
	);
	if (!inv) return problem(404, "Invoice not found");
	if (inv.status !== "draft") return problem(409, "Invoice is not a draft");

	const customer = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT name, email, address_json, vat_number FROM customers WHERE id = ? AND tenant_id = ? LIMIT 1",
		[inv.customer_id, params.ctx.tenantId],
	);
	if (!customer) return problem(400, "Customer missing");

	const items = await dbAll<any>(
		params.env.INVOICING_DB,
		"SELECT description, qty_milli, unit_price_cents, vat_rate FROM invoice_items WHERE invoice_id = ? ORDER BY created_at ASC",
		[params.invoiceId],
	);
	if (!items.length) return problem(400, "Invoice has no items");

	const now = isoNow();
	const numbering = await allocateInvoiceNumber({
		env: params.env,
		tenantId: params.ctx.tenantId,
		now,
	});

	const totals = asJson(inv.totals_json, {
		subtotal_cents: 0,
		vat_total_cents: 0,
		total_cents: 0,
		vat_breakdown: {},
	});

	const pdfBytes = await generateInvoicePdf({
		invoice: {
			id: params.invoiceId,
			type: inv.type as InvoiceType,
			status: "sent",
			number: numbering.number,
			currency: String(inv.currency ?? "EUR"),
			issue_date: inv.issue_date ? String(inv.issue_date) : now,
			due_date: inv.due_date ? String(inv.due_date) : null,
			payment_url: inv.payment_url ? String(inv.payment_url) : null,
			totals,
		},
		customer: {
			name: String(customer.name),
			email: String(customer.email),
			address: asJson(customer.address_json, null),
			vat_number: customer.vat_number ? String(customer.vat_number) : null,
		},
		items: items.map((it: any) => ({
			description: String(it.description),
			qty_milli: Number(it.qty_milli),
			unit_price_cents: Number(it.unit_price_cents),
			vat_rate: Number(it.vat_rate) as VatRate,
		})),
		mode: "final",
	});

	const sha = await sha256Hex(pdfBytes);
	const r2Key = `tenant/${params.ctx.tenantId}/invoices/${params.invoiceId}/${numbering.number}/${sha}.pdf`;
	await params.env.INVOICE_PDFS.put(r2Key, pdfBytes, {
		httpMetadata: { contentType: "application/pdf" },
		customMetadata: {
			tenant_id: params.ctx.tenantId,
			invoice_id: params.invoiceId,
			invoice_number: numbering.number,
			sha256: sha,
		},
	});

	const pdfUrl = `/api/invoices/${params.invoiceId}/pdf/${sha}`;
	const tokenPlain = randomTokenUrlSafe(32);
	const tokenHash = await sha256Hex(tokenPlain);
	const tokenTtlSeconds = Number(params.env.VIEW_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7);
	const expiresAt = new Date(Date.now() + tokenTtlSeconds * 1000).toISOString();
	const tokenId = crypto.randomUUID();
	const viewUrl = `${new URL(params.request.url).origin}/invoice-view/${tokenPlain}`;

	const tpl = await getDefaultTemplate({
		env: params.env,
		tenantId: params.ctx.tenantId,
		kind: "invoice_email",
	});
	const vars = {
		customer_name: String(customer.name),
		invoice_number: numbering.number,
		view_url: viewUrl,
		payment_url: inv.payment_url ? String(inv.payment_url) : "",
	};
	const subject = renderTemplate(tpl.subject, vars);
	const bodyHtml = renderTemplate(tpl.body_html, vars);
	const bodyText = tpl.body_text ? renderTemplate(tpl.body_text, vars) : null;

	const fromEmail = params.env.EMAIL_FROM ?? "no-reply@domain";
	const replyTo = params.env.EMAIL_REPLY_TO ?? "support@domain";

	const emailId = crypto.randomUUID();
	const nextState: InvoiceStatus = inv.payment_url ? "payment_pending" : "sent";

	await params.env.INVOICING_DB.batch([
		params.env.INVOICING_DB.prepare(
			"INSERT INTO invoice_view_tokens (id, tenant_id, invoice_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		).bind(tokenId, params.ctx.tenantId, params.invoiceId, tokenHash, expiresAt, now),
		params.env.INVOICING_DB.prepare(
			"UPDATE invoices SET status = ?, year = ?, seq = ?, number = ?, pdf_r2_key = ?, pdf_url = ?, pdf_sha256 = ?, pdf_finalized_at = ?, sent_at = ?, updated_by_user_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
		).bind(
			nextState,
			numbering.year,
			numbering.seq,
			numbering.number,
			r2Key,
			pdfUrl,
			sha,
			now,
			now,
			params.ctx.userId,
			now,
			params.invoiceId,
			params.ctx.tenantId,
		),
		params.env.INVOICING_DB.prepare(
			"INSERT INTO email_logs (id, tenant_id, invoice_id, kind, to_email, from_email, reply_to, subject, body_html, body_text, state, attempt_count, queued_at, next_attempt_at) VALUES (?, ?, ?, 'invoice', ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)",
		).bind(
			emailId,
			params.ctx.tenantId,
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
	]);

	await writeAudit({
		env: params.env,
		ctx: params.ctx,
		tenantId: params.ctx.tenantId,
		action: "invoice.send_requested",
		entity_type: "invoice",
		entity_id: params.invoiceId,
		data: { invoice_number: numbering.number, pdf_sha256: sha, pdf_url: pdfUrl },
		request: params.request,
	});

	return {
		email_log_id: emailId,
		invoice_number: numbering.number,
		pdf_sha256: sha,
		pdf_url: pdfUrl,
		view_url: viewUrl,
		status: nextState,
	};
}

export async function fetchFinalPdf(params: {
	env: Env;
	ctx: AuthContext;
	invoiceId: string;
	sha: string;
}) {
	const inv = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT number, pdf_r2_key, pdf_sha256 FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1",
		[params.invoiceId, params.ctx.tenantId],
	);
	if (!inv) return null;
	if (!inv.pdf_r2_key || !inv.pdf_sha256) return null;
	if (String(inv.pdf_sha256) !== params.sha) return "sha_mismatch" as const;
	const obj = await params.env.INVOICE_PDFS.get(String(inv.pdf_r2_key));
	if (!obj) return null;
	const headers = new Headers();
	headers.set("content-type", "application/pdf");
	headers.set(
		"content-disposition",
		`inline; filename="${inv.number ? `invoice-${inv.number}` : "invoice"}.pdf"`,
	);
	headers.set("cache-control", "private, max-age=31536000, immutable");
	return new Response(obj.body, { status: 200, headers });
}

export async function viewInvoiceByToken(params: {
	request: Request;
	env: Env;
	tokenPlain: string;
}) {
	const tokenHash = await sha256Hex(params.tokenPlain);
	const tok = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT id, tenant_id, invoice_id, expires_at, first_viewed_at FROM invoice_view_tokens WHERE token_hash = ? LIMIT 1",
		[tokenHash],
	);
	if (!tok) return problem(404, "Invalid link");
	if (new Date(String(tok.expires_at)).getTime() < Date.now()) return problem(410, "Link expired");

	const inv = await dbGet<any>(
		params.env.INVOICING_DB,
		"SELECT number, pdf_r2_key, pdf_sha256 FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1",
		[String(tok.invoice_id), String(tok.tenant_id)],
	);
	if (!inv?.pdf_r2_key || !inv?.pdf_sha256) return problem(404, "Invoice PDF not available");
	const obj = await params.env.INVOICE_PDFS.get(String(inv.pdf_r2_key));
	if (!obj) return problem(404, "Invoice PDF missing");

	const now = isoNow();
	const ip = getClientIp(params.request);
	const ua = getUserAgent(params.request);

	const stmts: D1PreparedStatement[] = [];
	stmts.push(
		params.env.INVOICING_DB.prepare(
			"INSERT INTO invoice_views (id, tenant_id, invoice_id, token_id, viewed_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
		).bind(
			crypto.randomUUID(),
			String(tok.tenant_id),
			String(tok.invoice_id),
			String(tok.id),
			now,
			ip,
			ua,
		),
	);
	if (!tok.first_viewed_at) {
		stmts.push(
			params.env.INVOICING_DB.prepare(
				"UPDATE invoice_view_tokens SET first_viewed_at = ? WHERE id = ?",
			).bind(now, String(tok.id)),
		);
	}
	await params.env.INVOICING_DB.batch(stmts);

	await writeAudit({
		env: params.env,
		ctx: null,
		tenantId: String(tok.tenant_id),
		action: "invoice.viewed",
		entity_type: "invoice",
		entity_id: String(tok.invoice_id),
		data: { via: "token" },
		request: params.request,
	});

	const headers = new Headers();
	headers.set("content-type", "application/pdf");
	headers.set(
		"content-disposition",
		`inline; filename="${inv.number ? `invoice-${inv.number}` : "invoice"}.pdf"`,
	);
	headers.set("cache-control", "private, max-age=300");
	return new Response(obj.body, { status: 200, headers });
}

export async function markInvoicePaidFromWebhook(params: {
	request: Request;
	env: Env;
	body: any;
}) {
	const tenantId = requireString(params.body.tenant_id, "tenant_id");
	const invoiceId = optionalString(params.body.invoice_id);
	const invoiceNumber = optionalString(params.body.invoice_number);
	const provider = requireString(params.body.provider, "provider");
	const status = requireString(params.body.status, "status");

	if (status !== "paid") return problem(400, "Unsupported status");

	let inv: any = null;
	if (invoiceId) {
		inv = await dbGet<any>(
			params.env.INVOICING_DB,
			"SELECT id, tenant_id, status FROM invoices WHERE id = ? AND tenant_id = ? LIMIT 1",
			[invoiceId, tenantId],
		);
	} else if (invoiceNumber) {
		inv = await dbGet<any>(
			params.env.INVOICING_DB,
			"SELECT id, tenant_id, status FROM invoices WHERE number = ? AND tenant_id = ? LIMIT 1",
			[invoiceNumber, tenantId],
		);
	} else {
		return problem(400, "Missing invoice_id or invoice_number");
	}
	if (!inv) return problem(404, "Invoice not found");

	const now = isoNow();
	await params.env.INVOICING_DB.batch([
		params.env.INVOICING_DB.prepare(
			"UPDATE invoices SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
		).bind(now, now, String(inv.id), tenantId),
		params.env.INVOICING_DB.prepare(
			"INSERT INTO payment_events (id, tenant_id, invoice_id, provider, event_id, payload_json, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		).bind(
			crypto.randomUUID(),
			tenantId,
			String(inv.id),
			provider,
			optionalString(params.body.event_id),
			JSON.stringify(params.body),
			now,
		),
	]);

	await writeAudit({
		env: params.env,
		ctx: null,
		tenantId,
		action: "invoice.paid",
		entity_type: "invoice",
		entity_id: String(inv.id),
		data: { provider },
		request: params.request,
	});

	return { ok: true, invoice_id: String(inv.id) };
}

