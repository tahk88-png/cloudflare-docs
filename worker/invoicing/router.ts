import { bootstrapIfAllowed, requireAuth, requireRole } from "./auth";
import { json, problem } from "./http";
import {
	createInvoice,
	fetchFinalPdf,
	generateDraftPdf,
	getInvoice,
	markInvoicePaidFromWebhook,
	updateInvoiceDraft,
	viewInvoiceByToken,
	writeAudit,
} from "./service";
import { dbGet, isoNow } from "./db";
import { processEmailQueue } from "./email";
import { processReminders } from "./reminders";

function withCors(res: Response) {
	const h = new Headers(res.headers);
	h.set("access-control-allow-origin", "*");
	h.set("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
	h.set(
		"access-control-allow-headers",
		"content-type,authorization,x-tenant-id,x-bootstrap-token",
	);
	return new Response(res.body, { status: res.status, headers: h });
}

async function readJson(request: Request) {
	const text = await request.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

async function verifyWebhookSignatureOrReject(request: Request, env: Env) {
	// Simple HMAC SHA-256 with shared secret:
	// signature = hex(hmac_sha256(secret, rawBody))
	if (!env.PAYMENT_WEBHOOK_SECRET) return null;
	const signature = request.headers.get("x-webhook-signature") ?? "";
	const raw = await request.clone().arrayBuffer();
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(env.PAYMENT_WEBHOOK_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, raw);
	const expected = Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	if (expected !== signature) return problem(401, "Invalid webhook signature");
	return null;
}

async function verifyHmacOrReject(request: Request, secret: string | undefined) {
	if (!secret) return problem(403, "Webhook disabled");
	const signature = request.headers.get("x-webhook-signature") ?? "";
	const raw = await request.clone().arrayBuffer();
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, raw);
	const expected = Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	if (expected !== signature) return problem(401, "Invalid webhook signature");
	return null;
}

export async function handleInvoicing(request: Request, env: Env) {
	const url = new URL(request.url);
	const { pathname } = url;

	if (pathname === "/api/health") {
		if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
		return withCors(
			json({
				ok: true,
				service: "invoicing",
			}),
		);
	}

	if (pathname === "/api/bootstrap" && request.method === "POST") {
		return withCors(await bootstrapIfAllowed(request, env));
	}

	// Secure invoice view endpoint for customers (no auth).
	if (pathname.startsWith("/invoice-view/") && request.method === "GET") {
		const tokenPlain = pathname.split("/").at(2);
		if (!tokenPlain) return problem(404, "Not found");
		return await viewInvoiceByToken({ request, env, tokenPlain });
	}

	if (pathname === "/webhooks/payments" && request.method === "POST") {
		const rejected = await verifyWebhookSignatureOrReject(request, env);
		if (rejected) return rejected;
		const body = await readJson(request);
		if (!body) return problem(400, "Invalid JSON");
		return json(await markInvoicePaidFromWebhook({ request, env, body }));
	}

	// Optional provider bounce webhook:
	// {
	//   "tenant_id": "...",
	//   "email_log_id": "...",
	//   "event": "bounced",
	//   "reason": "..."
	// }
	if (pathname === "/webhooks/email" && request.method === "POST") {
		const rejected = await verifyHmacOrReject(request, env.EMAIL_WEBHOOK_SECRET);
		if (rejected) return rejected;
		const body = await readJson(request);
		if (!body) return problem(400, "Invalid JSON");
		if (body.event !== "bounced") return problem(400, "Unsupported event");
		if (typeof body.tenant_id !== "string" || typeof body.email_log_id !== "string") {
			return problem(400, "Missing tenant_id/email_log_id");
		}
		const now = isoNow();
		await env.INVOICING_DB.prepare(
			"UPDATE email_logs SET state = 'bounced', bounced_at = ?, last_error = ? WHERE id = ? AND tenant_id = ?",
		).bind(now, typeof body.reason === "string" ? body.reason : null, body.email_log_id, body.tenant_id).run();
		await writeAudit({
			env,
			ctx: null,
			tenantId: body.tenant_id,
			action: "email.bounced",
			entity_type: "email_log",
			entity_id: body.email_log_id,
			data: { reason: body.reason ?? null },
			request,
		});
		return json({ ok: true });
	}

	// A small internal endpoint for running queue processors in non-cron environments.
	if (pathname === "/api/_internal/process-queues" && request.method === "POST") {
		const auth = await requireAuth(request, env);
		if (auth instanceof Response) return withCors(auth);
		const r = requireRole(auth, "admin");
		if (r) return withCors(r);
		const [emails, reminders] = await Promise.all([
			processEmailQueue(env, 50),
			processReminders(env, 50),
		]);
		return withCors(json({ ok: true, emails, reminders }));
	}

	// API routes below require auth.
	if (!pathname.startsWith("/api/")) return null;
	if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

	const ctx = await requireAuth(request, env);
	if (ctx instanceof Response) return withCors(ctx);

	// POST /api/invoices
	if (pathname === "/api/invoices" && request.method === "POST") {
		const r = requireRole(ctx, "accountant");
		if (r) return withCors(r);
		const body = await readJson(request);
		if (!body) return withCors(problem(400, "Invalid JSON"));
		const created = await createInvoice({ request, env, ctx, body });
		if (created instanceof Response) return withCors(created);
		return withCors(json(created, { status: 201 }));
	}

	// /api/invoices/:id and subroutes
	if (pathname.startsWith("/api/invoices/")) {
		const parts = pathname.split("/").filter(Boolean); // ["api","invoices",...]
		const invoiceId = parts[2];
		if (!invoiceId) return withCors(problem(404, "Not found"));

		// GET /api/invoices/:id
		if (parts.length === 3 && request.method === "GET") {
			const r = requireRole(ctx, "viewer");
			if (r) return withCors(r);
			const data = await getInvoice({ env, ctx, invoiceId });
			if (!data) return withCors(problem(404, "Invoice not found"));
			return withCors(json(data));
		}

		// PUT /api/invoices/:id (draft only)
		if (parts.length === 3 && request.method === "PUT") {
			const r = requireRole(ctx, "accountant");
			if (r) return withCors(r);
			const body = await readJson(request);
			if (!body) return withCors(problem(400, "Invalid JSON"));
			const res = await updateInvoiceDraft({ request, env, ctx, invoiceId, body });
			if (res instanceof Response) return withCors(res);
			return withCors(json(res));
		}

		// POST /api/invoices/:id/generate-pdf (draft watermark)
		if (parts.length === 4 && parts[3] === "generate-pdf" && request.method === "POST") {
			const r = requireRole(ctx, "viewer");
			if (r) return withCors(r);
			const bytes = await generateDraftPdf({ env, ctx, invoiceId });
			if (!bytes) return withCors(problem(404, "Invoice not found"));
			return new Response(bytes, {
				status: 200,
				headers: {
					"content-type": "application/pdf",
					"content-disposition": `inline; filename="invoice-draft-${invoiceId}.pdf"`,
					"cache-control": "no-store",
				},
			});
		}

		// POST /api/invoices/:id/send-email (finalize + queue)
		if (parts.length === 4 && parts[3] === "send-email" && request.method === "POST") {
			const r = requireRole(ctx, "accountant");
			if (r) return withCors(r);
			const out = await (await import("./service")).finalizeAndQueueInvoiceEmail({
				request,
				env,
				ctx,
				invoiceId,
			});
			if (out instanceof Response) return withCors(out);
			return withCors(json(out, { status: 202 }));
		}

		// GET /api/invoices/:id/pdf/:sha (RBAC-protected accountant view)
		if (parts.length === 5 && parts[3] === "pdf" && request.method === "GET") {
			const r = requireRole(ctx, "viewer");
			if (r) return withCors(r);
			const sha = parts[4];
			const res = await fetchFinalPdf({ env, ctx, invoiceId, sha });
			if (res === "sha_mismatch") return withCors(problem(404, "PDF not found"));
			if (!res) return withCors(problem(404, "PDF not found"));
			return res;
		}
	}

	// Customer endpoints (minimal for reminders configuration)
	if (pathname === "/api/customers" && request.method === "POST") {
		const r = requireRole(ctx, "accountant");
		if (r) return withCors(r);
		const body = await readJson(request);
		if (!body) return withCors(problem(400, "Invalid JSON"));
		if (typeof body.name !== "string" || typeof body.email !== "string") {
			return withCors(problem(400, "Missing name/email"));
		}
		const now = isoNow();
		const id = crypto.randomUUID();
		await env.INVOICING_DB.prepare(
			"INSERT INTO customers (id, tenant_id, name, email, address_json, vat_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		).bind(
			id,
			ctx.tenantId,
			body.name,
			body.email,
			body.address ? JSON.stringify(body.address) : null,
			body.vat_number ?? null,
			now,
			now,
		).run();
		await writeAudit({
			env,
			ctx,
			tenantId: ctx.tenantId,
			action: "customer.create",
			entity_type: "customer",
			entity_id: id,
			request,
		});
		return withCors(json({ id }, { status: 201 }));
	}

	if (pathname.startsWith("/api/customers/")) {
		const parts = pathname.split("/").filter(Boolean); // ["api","customers",...]
		const customerId = parts[2];
		if (!customerId) return withCors(problem(404, "Not found"));

		if (parts.length === 3 && request.method === "GET") {
			const r = requireRole(ctx, "viewer");
			if (r) return withCors(r);
			const c = await dbGet<any>(
				env.INVOICING_DB,
				"SELECT id, name, email, address_json, vat_number, created_at, updated_at FROM customers WHERE id = ? AND tenant_id = ? LIMIT 1",
				[customerId, ctx.tenantId],
			);
			if (!c) return withCors(problem(404, "Customer not found"));
			return withCors(
				json({
					...c,
					address: c.address_json ? JSON.parse(String(c.address_json)) : null,
				}),
			);
		}

		if (parts.length === 3 && request.method === "PUT") {
			const r = requireRole(ctx, "accountant");
			if (r) return withCors(r);
			const body = await readJson(request);
			if (!body) return withCors(problem(400, "Invalid JSON"));
			const now = isoNow();
			await env.INVOICING_DB.prepare(
				"UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), address_json = COALESCE(?, address_json), vat_number = COALESCE(?, vat_number), updated_at = ? WHERE id = ? AND tenant_id = ?",
			).bind(
				typeof body.name === "string" ? body.name : null,
				typeof body.email === "string" ? body.email : null,
				body.address ? JSON.stringify(body.address) : null,
				typeof body.vat_number === "string" ? body.vat_number : null,
				now,
				customerId,
				ctx.tenantId,
			).run();
			await writeAudit({
				env,
				ctx,
				tenantId: ctx.tenantId,
				action: "customer.update",
				entity_type: "customer",
				entity_id: customerId,
				request,
			});
			return withCors(json({ ok: true }));
		}

		// PUT /api/customers/:id/reminders
		if (parts.length === 4 && parts[3] === "reminders" && request.method === "PUT") {
			const r = requireRole(ctx, "accountant");
			if (r) return withCors(r);
			const body = await readJson(request);
			if (!body || !Array.isArray(body.days_after_sent)) {
				return withCors(problem(400, "days_after_sent must be an array"));
			}
			const days = body.days_after_sent
				.map((n: any) => (typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : null))
				.filter((n: any) => n && n > 0)
				.sort((a: number, b: number) => a - b);

			const now = isoNow();
			await env.INVOICING_DB.batch([
				env.INVOICING_DB.prepare(
					"DELETE FROM reminder_configs WHERE tenant_id = ? AND scope_type = 'customer' AND scope_id = ?",
				).bind(ctx.tenantId, customerId),
				env.INVOICING_DB.prepare(
					"INSERT INTO reminder_configs (id, tenant_id, scope_type, scope_id, days_after_sent_json, enabled, created_at, updated_at) VALUES (?, ?, 'customer', ?, ?, 1, ?, ?)",
				).bind(
					crypto.randomUUID(),
					ctx.tenantId,
					customerId,
					JSON.stringify(days),
					now,
					now,
				),
			]);
			await writeAudit({
				env,
				ctx,
				tenantId: ctx.tenantId,
				action: "customer.reminders_updated",
				entity_type: "customer",
				entity_id: customerId,
				data: { days_after_sent: days },
				request,
			});
			return withCors(json({ ok: true, days_after_sent: days }));
		}
	}

	return withCors(problem(404, "Not found"));
}

