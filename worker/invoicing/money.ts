import type { InvoiceItemInput, InvoiceType, VatRate } from "./types";

function roundDiv(numerator: number, denominator: number) {
	// Half-up integer rounding (deterministic for accounting).
	if (denominator === 0) throw new Error("division by zero");
	const q = Math.trunc(numerator / denominator);
	const r = numerator % denominator;
	const abs2r = Math.abs(r) * 2;
	if (abs2r > Math.abs(denominator)) return q + Math.sign(numerator) * Math.sign(denominator);
	if (abs2r < Math.abs(denominator)) return q;
	// exactly half: round away from zero
	return q + Math.sign(numerator) * Math.sign(denominator);
}

export function normalizeVatRate(v: number): VatRate {
	if (v === 0 || v === 9 || v === 22) return v;
	throw new Error("Invalid VAT rate (allowed: 0, 9, 22)");
}

export function computeInvoiceTotals(
	items: InvoiceItemInput[],
	type: InvoiceType,
) {
	const sign = type === "credit" ? -1 : 1;

	let subtotal_cents = 0;
	let vat_total_cents = 0;
	const vat_breakdown: Record<string, { base_cents: number; vat_cents: number }> =
		{};

	for (const item of items) {
		const line_base = roundDiv(item.unit_price_cents * item.qty_milli, 1000);
		const line_vat = roundDiv(line_base * item.vat_rate, 100);
		subtotal_cents += line_base;
		vat_total_cents += line_vat;

		const k = String(item.vat_rate);
		const prev = vat_breakdown[k] ?? { base_cents: 0, vat_cents: 0 };
		prev.base_cents += line_base;
		prev.vat_cents += line_vat;
		vat_breakdown[k] = prev;
	}

	const total_cents = subtotal_cents + vat_total_cents;

	return {
		subtotal_cents: subtotal_cents * sign,
		vat_total_cents: vat_total_cents * sign,
		total_cents: total_cents * sign,
		vat_breakdown: Object.fromEntries(
			Object.entries(vat_breakdown).map(([k, v]) => [
				k,
				{
					base_cents: v.base_cents * sign,
					vat_cents: v.vat_cents * sign,
				},
			]),
		),
	};
}

export function formatMoney(cents: number, currency = "EUR") {
	const sign = cents < 0 ? "-" : "";
	const abs = Math.abs(cents);
	const euros = Math.trunc(abs / 100);
	const rem = abs % 100;
	return `${sign}${euros}.${String(rem).padStart(2, "0")} ${currency}`;
}

