import { formatMoney } from "./money";
import type { InvoiceStatus, InvoiceType, VatRate } from "./types";

export interface PdfInvoice {
	id: string;
	type: InvoiceType;
	status: InvoiceStatus;
	number: string | null;
	currency: string;
	issue_date: string | null;
	due_date: string | null;
	payment_url: string | null;
	totals: {
		subtotal_cents: number;
		vat_total_cents: number;
		total_cents: number;
		vat_breakdown: Record<string, { base_cents: number; vat_cents: number }>;
	};
}

export interface PdfCustomer {
	name: string;
	email: string;
	address?: unknown;
	vat_number?: string | null;
}

export interface PdfItem {
	description: string;
	qty_milli: number;
	unit_price_cents: number;
	vat_rate: VatRate;
}

export type PdfMode = "draft" | "final";

function fmtQty(qty_milli: number) {
	const whole = Math.trunc(qty_milli / 1000);
	const frac = qty_milli % 1000;
	if (frac === 0) return String(whole);
	return `${whole}.${String(Math.abs(frac)).padStart(3, "0")}`.replace(/0+$/g, "");
}

export async function generateInvoicePdf(params: {
	invoice: PdfInvoice;
	customer: PdfCustomer;
	items: PdfItem[];
	mode: PdfMode;
}) {
	// Lazy-load pdf-lib so the docs Worker can start even if PDF code isn't used.
	const { PDFDocument, StandardFonts, rgb, degrees } = (await import("pdf-lib")) as any;

	const { invoice, customer, items, mode } = params;
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595.28, 841.89]); // A4

	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	const margin = 50;
	let y = 800;

	const title =
		invoice.type === "credit"
			? invoice.number
				? `CREDIT NOTE ${invoice.number}`
				: "CREDIT NOTE (DRAFT)"
			: invoice.number
				? `INVOICE ${invoice.number}`
				: "INVOICE (DRAFT)";

	page.drawText(title, {
		x: margin,
		y,
		size: 20,
		font: bold,
		color: rgb(0.05, 0.05, 0.05),
	});
	y -= 28;

	page.drawText(`Bill to: ${customer.name} <${customer.email}>`, {
		x: margin,
		y,
		size: 11,
		font,
		color: rgb(0.2, 0.2, 0.2),
	});
	y -= 14;
	if (customer.vat_number) {
		page.drawText(`VAT No: ${customer.vat_number}`, {
			x: margin,
			y,
			size: 11,
			font,
			color: rgb(0.2, 0.2, 0.2),
		});
		y -= 14;
	}
	if (invoice.issue_date) {
		page.drawText(`Issue date: ${invoice.issue_date.slice(0, 10)}`, {
			x: margin,
			y,
			size: 11,
			font,
			color: rgb(0.2, 0.2, 0.2),
		});
		y -= 14;
	}
	if (invoice.due_date) {
		page.drawText(`Due date: ${invoice.due_date.slice(0, 10)}`, {
			x: margin,
			y,
			size: 11,
			font,
			color: rgb(0.2, 0.2, 0.2),
		});
		y -= 18;
	}

	// Table header
	const colX = { desc: margin, qty: 360, unit: 420, vat: 490 };
	page.drawText("Description", { x: colX.desc, y, size: 11, font: bold });
	page.drawText("Qty", { x: colX.qty, y, size: 11, font: bold });
	page.drawText("Unit", { x: colX.unit, y, size: 11, font: bold });
	page.drawText("VAT", { x: colX.vat, y, size: 11, font: bold });
	y -= 10;
	page.drawLine({
		start: { x: margin, y },
		end: { x: 545, y },
		thickness: 1,
		color: rgb(0.8, 0.8, 0.8),
	});
	y -= 16;

	for (const it of items) {
		if (y < 130) {
			// Simple: no pagination in this minimal generator.
			break;
		}
		page.drawText(it.description.slice(0, 60), {
			x: colX.desc,
			y,
			size: 10,
			font,
		});
		page.drawText(fmtQty(it.qty_milli), { x: colX.qty, y, size: 10, font });
		page.drawText(formatMoney(it.unit_price_cents, invoice.currency), {
			x: colX.unit,
			y,
			size: 10,
			font,
		});
		page.drawText(`${it.vat_rate}%`, { x: colX.vat, y, size: 10, font });
		y -= 14;
	}

	y -= 8;
	page.drawLine({
		start: { x: margin, y },
		end: { x: 545, y },
		thickness: 1,
		color: rgb(0.8, 0.8, 0.8),
	});
	y -= 18;

	const totalsX = 360;
	page.drawText(`Subtotal: ${formatMoney(invoice.totals.subtotal_cents, invoice.currency)}`, {
		x: totalsX,
		y,
		size: 11,
		font,
	});
	y -= 14;
	page.drawText(`VAT: ${formatMoney(invoice.totals.vat_total_cents, invoice.currency)}`, {
		x: totalsX,
		y,
		size: 11,
		font,
	});
	y -= 14;
	page.drawText(`Total: ${formatMoney(invoice.totals.total_cents, invoice.currency)}`, {
		x: totalsX,
		y,
		size: 12,
		font: bold,
	});
	y -= 22;

	if (invoice.payment_url) {
		page.drawText(`Payment link: ${invoice.payment_url}`, {
			x: margin,
			y,
			size: 10,
			font,
			color: rgb(0.1, 0.1, 0.6),
		});
		y -= 14;
	}

	// VAT breakdown
	const breakdown = Object.entries(invoice.totals.vat_breakdown)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([rate, v]) => ({
			rate,
			base: formatMoney(v.base_cents, invoice.currency),
			vat: formatMoney(v.vat_cents, invoice.currency),
		}));
	if (breakdown.length > 0) {
		page.drawText("VAT breakdown:", { x: margin, y, size: 10, font: bold });
		y -= 12;
		for (const b of breakdown) {
			page.drawText(`${b.rate}% base ${b.base} / VAT ${b.vat}`, {
				x: margin,
				y,
				size: 9,
				font,
				color: rgb(0.25, 0.25, 0.25),
			});
			y -= 11;
		}
	}

	if (mode === "draft") {
		page.drawText("DRAFT", {
			x: 130,
			y: 420,
			size: 80,
			font: bold,
			color: rgb(0.8, 0.8, 0.8),
			rotate: degrees(35),
			opacity: 0.25,
		});
	}

	const bytes = await pdfDoc.save();
	return new Uint8Array(bytes);
}

