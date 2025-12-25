import { dbAll, dbGet, isoNow } from "./db";
import { enqueueReminderIfDue } from "./email";

function parseDays(value: unknown): number[] {
	if (typeof value !== "string") return [];
	try {
		const arr = JSON.parse(value);
		if (!Array.isArray(arr)) return [];
		return arr
			.map((n) => (typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : null))
			.filter((n): n is number => n !== null && n > 0)
			.sort((a, b) => a - b);
	} catch {
		return [];
	}
}

export async function processReminders(env: Env, limitInvoices = 30) {
	const now = isoNow();
	const invoices = await dbAll<any>(
		env.INVOICING_DB,
		"SELECT id, tenant_id, customer_id, sent_at FROM invoices WHERE type = 'invoice' AND status IN ('sent', 'payment_pending') AND sent_at IS NOT NULL ORDER BY sent_at ASC LIMIT ?",
		[limitInvoices],
	);

	let queued = 0;

	for (const inv of invoices) {
		const sentAt = new Date(String(inv.sent_at));
		if (Number.isNaN(sentAt.getTime())) continue;

		const invCfg = await dbGet<any>(
			env.INVOICING_DB,
			"SELECT days_after_sent_json FROM reminder_configs WHERE tenant_id = ? AND scope_type = 'invoice' AND scope_id = ? AND enabled = 1 LIMIT 1",
			[String(inv.tenant_id), String(inv.id)],
		);
		const custCfg = invCfg
			? null
			: await dbGet<any>(
					env.INVOICING_DB,
					"SELECT days_after_sent_json FROM reminder_configs WHERE tenant_id = ? AND scope_type = 'customer' AND scope_id = ? AND enabled = 1 LIMIT 1",
					[String(inv.tenant_id), String(inv.customer_id)],
				);

		const days = parseDays(invCfg?.days_after_sent_json ?? custCfg?.days_after_sent_json);
		if (!days.length) continue;

		for (const day of days) {
			const scheduledFor = new Date(sentAt.getTime() + day * 86400 * 1000).toISOString();
			if (scheduledFor > now) continue;

			const exists = await dbGet<{ id: string }>(
				env.INVOICING_DB,
				"SELECT id FROM reminder_sends WHERE tenant_id = ? AND invoice_id = ? AND scheduled_for = ? LIMIT 1",
				[String(inv.tenant_id), String(inv.id), scheduledFor],
			);
			if (exists) continue;

			const res = await enqueueReminderIfDue({
				env,
				tenantId: String(inv.tenant_id),
				invoiceId: String(inv.id),
				scheduledFor,
			});
			if ((res as any)?.ok) queued++;
		}
	}

	return { queued };
}

