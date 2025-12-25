// PDF generation service with DRAFT/FINAL modes

import type { Invoice, InvoiceItem, Customer, Company, PDFMode } from './types';

export class PDFService {
	constructor(
		private r2Bucket: R2Bucket,
		private domain: string
	) {}

	async generatePDF(
		invoice: Invoice,
		customer: Customer,
		company: Company,
		mode: PDFMode
	): Promise<{ url: string; sha256: string; buffer: ArrayBuffer }> {
		// Generate PDF using a library (we'll use a simple HTML-to-PDF approach)
		// In production, you might use puppeteer-core or pdfkit
		const pdfBuffer = await this.renderPDF(invoice, customer, company, mode);
		
		// Calculate SHA256 hash
		const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

		// Store in R2
		const key = `invoices/${invoice.company_id}/${invoice.id}/${mode.toLowerCase()}-${sha256.substring(0, 8)}.pdf`;
		await this.r2Bucket.put(key, pdfBuffer, {
			httpMetadata: {
				contentType: 'application/pdf',
			},
			customMetadata: {
				invoice_id: invoice.id,
				mode: mode,
				sha256: sha256,
			},
		});

		const url = `https://${this.domain}/pdfs/${key}`;
		
		return { url, sha256, buffer: pdfBuffer };
	}

	private async renderPDF(
		invoice: Invoice,
		customer: Customer,
		company: Company,
		mode: PDFMode
	): Promise<ArrayBuffer> {
		// Generate HTML for PDF
		const html = this.generateHTML(invoice, customer, company, mode);
		
		// Convert HTML to PDF
		// For Cloudflare Workers, we'll use a simple approach with PDFKit-like generation
		// In production, you might want to use a service or library that works in Workers
		return this.htmlToPDF(html);
	}

	private generateHTML(
		invoice: Invoice,
		customer: Customer,
		company: Company,
		mode: PDFMode
	): string {
		const invoiceDate = new Date(invoice.invoice_date * 1000).toLocaleDateString();
		const dueDate = new Date(invoice.due_date * 1000).toLocaleDateString();
		
		const watermarkStyle = mode === 'DRAFT' 
			? `
				.watermark {
					position: fixed;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%) rotate(-45deg);
					font-size: 72px;
					color: rgba(200, 200, 200, 0.3);
					z-index: 1000;
					font-weight: bold;
					pointer-events: none;
				}
			`
			: '';

		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Invoice ${invoice.invoice_number}</title>
	<style>
		body {
			font-family: Arial, sans-serif;
			margin: 40px;
			color: #333;
		}
		${watermarkStyle}
		.header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 40px;
		}
		.company-info {
			flex: 1;
		}
		.invoice-info {
			text-align: right;
		}
		.invoice-number {
			font-size: 24px;
			font-weight: bold;
			margin-bottom: 10px;
		}
		.bill-to {
			margin-bottom: 30px;
		}
		.bill-to h3 {
			margin-bottom: 10px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 30px;
		}
		table th {
			background-color: #f5f5f5;
			padding: 12px;
			text-align: left;
			border-bottom: 2px solid #ddd;
		}
		table td {
			padding: 12px;
			border-bottom: 1px solid #eee;
		}
		table td:last-child {
			text-align: right;
		}
		.totals {
			text-align: right;
			margin-top: 20px;
		}
		.total-row {
			padding: 8px 0;
		}
		.total-row.total {
			font-size: 18px;
			font-weight: bold;
			border-top: 2px solid #333;
			padding-top: 10px;
		}
		.notes {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #ddd;
		}
	</style>
</head>
<body>
	${mode === 'DRAFT' ? '<div class="watermark">DRAFT</div>' : ''}
	
	<div class="header">
		<div class="company-info">
			<h2>${this.escapeHtml(company.name)}</h2>
			${company.address_line1 ? `<div>${this.escapeHtml(company.address_line1)}</div>` : ''}
			${company.address_line2 ? `<div>${this.escapeHtml(company.address_line2)}</div>` : ''}
			${company.city || company.postal_code ? `<div>${this.escapeHtml([company.postal_code, company.city].filter(Boolean).join(' '))}</div>` : ''}
			${company.country ? `<div>${this.escapeHtml(company.country)}</div>` : ''}
			${company.tax_id ? `<div>Tax ID: ${this.escapeHtml(company.tax_id)}</div>` : ''}
		</div>
		<div class="invoice-info">
			<div class="invoice-number">INVOICE ${this.escapeHtml(invoice.invoice_number)}</div>
			<div>Date: ${invoiceDate}</div>
			<div>Due Date: ${dueDate}</div>
		</div>
	</div>

	<div class="bill-to">
		<h3>Bill To:</h3>
		<div><strong>${this.escapeHtml(customer.name)}</strong></div>
		${customer.address_line1 ? `<div>${this.escapeHtml(customer.address_line1)}</div>` : ''}
		${customer.address_line2 ? `<div>${this.escapeHtml(customer.address_line2)}</div>` : ''}
		${customer.city || customer.postal_code ? `<div>${this.escapeHtml([customer.postal_code, customer.city].filter(Boolean).join(' '))}</div>` : ''}
		${customer.country ? `<div>${this.escapeHtml(customer.country)}</div>` : ''}
		${customer.tax_id ? `<div>Tax ID: ${this.escapeHtml(customer.tax_id)}</div>` : ''}
	</div>

	<table>
		<thead>
			<tr>
				<th>Description</th>
				<th>Quantity</th>
				<th>Unit Price</th>
				<th>VAT Rate</th>
				<th>Total</th>
			</tr>
		</thead>
		<tbody>
			${invoice.items?.map(item => `
				<tr>
					<td>${this.escapeHtml(item.description)}</td>
					<td>${item.quantity}</td>
					<td>${this.formatCurrency(item.unit_price, invoice.currency)}</td>
					<td>${(item.vat_rate * 100).toFixed(0)}%</td>
					<td>${this.formatCurrency(item.line_total_with_vat, invoice.currency)}</td>
				</tr>
			`).join('') || ''}
		</tbody>
	</table>

	<div class="totals">
		<div class="total-row">
			<strong>Subtotal:</strong> ${this.formatCurrency(invoice.subtotal, invoice.currency)}
		</div>
		${invoice.vat_amount > 0 ? `
			<div class="total-row">
				<strong>VAT (${(invoice.vat_rate * 100).toFixed(0)}%):</strong> ${this.formatCurrency(invoice.vat_amount, invoice.currency)}
			</div>
		` : ''}
		<div class="total-row total">
			<strong>Total:</strong> ${this.formatCurrency(invoice.total, invoice.currency)}
		</div>
	</div>

	${invoice.notes ? `
		<div class="notes">
			<strong>Notes:</strong><br>
			${this.escapeHtml(invoice.notes).replace(/\n/g, '<br>')}
		</div>
	` : ''}
</body>
</html>
		`;
	}

	private async htmlToPDF(html: string): Promise<ArrayBuffer> {
		// For Cloudflare Workers, we need to use a PDF generation service
		// This is a simplified version - in production, you might:
		// 1. Use a third-party service (like PDFShift, HTMLPDF, etc.)
		// 2. Use a Worker that calls Chrome/Chromium via Puppeteer
		// 3. Use a library like pdfkit that works in Workers
		
		// For now, we'll create a simple PDF structure
		// In production, replace this with actual PDF generation
		const pdfContent = this.generateSimplePDF(html);
		return new TextEncoder().encode(pdfContent).buffer;
	}

	private generateSimplePDF(html: string): string {
		// This is a placeholder - in production, use a real PDF library
		// For example, you could use pdfkit or call an external service
		// For now, return a minimal PDF structure
		return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Invoice PDF - HTML content converted) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;
	}

	private escapeHtml(text: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		};
		return text.replace(/[&<>"']/g, m => map[m]);
	}

	private formatCurrency(amount: number, currency: string): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency || 'EUR',
		}).format(amount);
	}
}
