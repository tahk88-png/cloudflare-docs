import { sha256Hex, randomTokenUrlSafe } from "./crypto";
import { dbGet } from "./db";
import { problem } from "./http";
import type { Role } from "./types";

export interface AuthContext {
	tenantId: string;
	userId: string;
	role: Role;
}

const roleRank: Record<Role, number> = {
	viewer: 1,
	accountant: 2,
	admin: 3,
	owner: 4,
};

export function hasRole(ctx: AuthContext, minimum: Role) {
	return roleRank[ctx.role] >= roleRank[minimum];
}

export async function requireAuth(
	request: Request,
	env: Env,
): Promise<AuthContext | Response> {
	const tenantId = request.headers.get("x-tenant-id");
	if (!tenantId) return problem(400, "Missing header: X-Tenant-Id");

	const auth = request.headers.get("authorization") ?? "";
	const m = auth.match(/^Bearer\s+(.+)$/i);
	if (!m) return problem(401, "Missing or invalid Authorization header");
	const apiKey = m[1].trim();
	if (!apiKey) return problem(401, "Missing API key");

	const keyHash = await sha256Hex(apiKey);
	const row = await dbGet<{
		user_id: string;
		tenant_id: string;
		revoked_at: string | null;
	}>(env.INVOICING_DB, "SELECT user_id, tenant_id, revoked_at FROM api_keys WHERE key_hash = ? LIMIT 1", [
		keyHash,
	]);
	if (!row) return problem(401, "Invalid API key");
	if (row.revoked_at) return problem(401, "API key revoked");
	if (row.tenant_id !== tenantId) return problem(403, "API key not valid for tenant");

	const membership = await dbGet<{ role: Role }>(
		env.INVOICING_DB,
		"SELECT role FROM memberships WHERE tenant_id = ? AND user_id = ? LIMIT 1",
		[tenantId, row.user_id],
	);
	if (!membership) return problem(403, "User not a member of tenant");

	return { tenantId, userId: row.user_id, role: membership.role };
}

export function requireRole(ctx: AuthContext, minimum: Role) {
	if (!hasRole(ctx, minimum)) {
		return problem(403, "Insufficient role", { required: minimum, got: ctx.role });
	}
	return null;
}

export async function bootstrapIfAllowed(
	request: Request,
	env: Env,
): Promise<Response> {
	const token = request.headers.get("x-bootstrap-token");
	if (!env.BOOTSTRAP_TOKEN || token !== env.BOOTSTRAP_TOKEN) {
		return problem(403, "Bootstrap disabled");
	}
	const body = (await request.json().catch(() => null)) as
		| {
				tenant_name: string;
				user_email: string;
				user_name?: string;
		  }
		| null;
	if (!body?.tenant_name || !body?.user_email) {
		return problem(400, "Missing tenant_name or user_email");
	}

	const now = new Date().toISOString();
	const tenantId = crypto.randomUUID();
	const userId = crypto.randomUUID();
	const apiKeyPlain = `inv_${randomTokenUrlSafe(32)}`;
	const keyHash = await sha256Hex(apiKeyPlain);
	const apiKeyId = crypto.randomUUID();

	await env.INVOICING_DB.batch([
		env.INVOICING_DB.prepare(
			"INSERT INTO tenants (id, name, created_at) VALUES (?, ?, ?)",
		).bind(tenantId, body.tenant_name, now),
		env.INVOICING_DB.prepare(
			"INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
		).bind(userId, body.user_email, body.user_name ?? null, now),
		env.INVOICING_DB.prepare(
			"INSERT INTO memberships (tenant_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)",
		).bind(tenantId, userId, now),
		env.INVOICING_DB.prepare(
			"INSERT INTO api_keys (id, tenant_id, user_id, key_hash, created_at) VALUES (?, ?, ?, ?, ?)",
		).bind(apiKeyId, tenantId, userId, keyHash, now),
		env.INVOICING_DB.prepare(
			"INSERT INTO templates (id, tenant_id, kind, subject, body_html, body_text, is_default, created_at, updated_at) VALUES (?, ?, 'invoice_email', ?, ?, ?, 1, ?, ?)",
		).bind(
			crypto.randomUUID(),
			tenantId,
			"Your invoice {{invoice_number}}",
			"<p>Hello {{customer_name}},</p><p>Your invoice is ready: <a href=\"{{view_url}}\">View invoice</a></p>",
			"Hello {{customer_name}},\n\nYour invoice is ready: {{view_url}}\n",
			now,
			now,
		),
		env.INVOICING_DB.prepare(
			"INSERT INTO templates (id, tenant_id, kind, subject, body_html, body_text, is_default, created_at, updated_at) VALUES (?, ?, 'reminder_email', ?, ?, ?, 1, ?, ?)",
		).bind(
			crypto.randomUUID(),
			tenantId,
			"Payment reminder: {{invoice_number}}",
			"<p>Hello {{customer_name}},</p><p>This is a friendly reminder that invoice <strong>{{invoice_number}}</strong> is still unpaid. <a href=\"{{view_url}}\">View invoice</a></p>",
			"Hello {{customer_name}},\n\nReminder: invoice {{invoice_number}} is still unpaid: {{view_url}}\n",
			now,
			now,
		),
	]);

	return new Response(
		JSON.stringify({
			tenant_id: tenantId,
			user_id: userId,
			api_key: apiKeyPlain,
		}),
		{
			status: 201,
			headers: { "content-type": "application/json; charset=utf-8" },
		},
	);
}

