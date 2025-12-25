// API route handlers

import type { Env } from '../types';
import { Database } from '../db';
import { PDFService } from '../pdf';
import { EmailService } from '../email';
import { AccountingService } from '../accounting';
import { AuthService } from '../auth';

export class InvoiceAPI {
	constructor(
		private db: Database,
		private pdfService: PDFService,
		private emailService: EmailService,
		private authService: AuthService
	) {}

	async handleRequest(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Authenticate user
		const user = await this.authService.authenticate(request, env);
		if (!user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Route handling
		if (path === '/api/invoices' && request.method === 'POST') {
			return this.createInvoice(request, user, env);
		}

		if (path.startsWith('/api/invoices/') && request.method === 'PUT') {
			const id = path.split('/')[3];
			return this.updateInvoice(request, id, user, env);
		}

		if (path.startsWith('/api/invoices/') && path.endsWith('/generate-pdf') && request.method === 'POST') {
			const id = path.split('/')[3];
			return this.generatePDF(request, id, user, env);
		}

		if (path.startsWith('/api/invoices/') && path.endsWith('/send-email') && request.method === 'POST') {
			const id = path.split('/')[3];
			return this.sendEmail(request, id, user, env);
		}

		if (path.startsWith('/api/invoices/') && request.method === 'GET') {
			const id = path.split('/')[3];
			return this.getInvoice(id, user, env);
		}

		if (path.startsWith('/invoice-view/') && request.method === 'GET') {
			const token = path.split('/')[2];
			return this.viewInvoice(token, request, env);
		}

		if (path === '/webhooks/payments' && request.method === 'POST') {
			return this.handlePaymentWebhook(request, env);
		}

		if (path === '/api/credit-notes' && request.method === 'POST') {
			return this.createCreditNote(request, user, env);
		}

		return new Response(JSON.stringify({ error: 'Not Found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	private async createInvoice(request: Request, user: any, env: Env): Promise<Response> {
		if (!this.authService.hasPermission(user, 'accountant')) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		try {
			const body = await request.json() as any;
			
			// Validate request
			if (!body.customer_id || !body.invoice_date || !body.due_date || !body.items || body.items.length === 0) {
				return new Response(JSON.stringify({ error: 'Missing required fields' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Get customer
			const customer = await this.db.getCustomer(body.customer_id);
			if (!customer || customer.company_id !== user.company_id) {
				return new Response(JSON.stringify({ error: 'Customer not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Parse dates
			const invoiceDate = Math.floor(new Date(body.invoice_date).getTime() / 1000);
			const dueDate = Math.floor(new Date(body.due_date).getTime() / 1000);
			const year = new Date(body.invoice_date).getFullYear();

			// Get next invoice number
			const invoiceNumber = await this.db.getNextInvoiceNumber(user.company_id, year);

			// Calculate totals
			const vatRate = body.vat_rate ?? 0;
			if (!AccountingService.validateVatRate(vatRate)) {
				return new Response(JSON.stringify({ error: 'Invalid VAT rate' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const { subtotal, vat_amount, total, items } = AccountingService.calculateTotals(
				body.items,
				vatRate
			);

			// Create invoice
			const invoice = await this.db.createInvoice({
				company_id: user.company_id,
				invoice_number: invoiceNumber,
				customer_id: body.customer_id,
				status: 'draft',
				invoice_date: invoiceDate,
				due_date: dueDate,
				currency: body.currency || 'EUR',
				vat_rate: vatRate,
				subtotal,
				vat_amount,
				total,
				notes: body.notes,
				created_by: user.id,
			});

			// Create invoice items
			await this.db.createInvoiceItems(
				items.map(item => ({ ...item, invoice_id: invoice.id }))
			);

			// Audit log
			await this.db.createAuditLog({
				company_id: user.company_id,
				user_id: user.id,
				action: 'invoice.created',
				resource_type: 'invoice',
				resource_id: invoice.id,
				new_values: JSON.stringify(invoice),
				ip_address: this.getClientIP(request),
				user_agent: request.headers.get('User-Agent') || undefined,
			});

			// Reload invoice with items
			const fullInvoice = await this.db.getInvoice(invoice.id);

			return new Response(JSON.stringify(fullInvoice), {
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	private async updateInvoice(request: Request, id: string, user: any, env: Env): Promise<Response> {
		const invoice = await this.db.getInvoice(id);
		if (!invoice) {
			return new Response(JSON.stringify({ error: 'Invoice not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!this.authService.canModifyInvoice(user, invoice)) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		try {
			const body = await request.json() as any;
			const oldValues = JSON.stringify(invoice);

			// Update invoice fields
			const updates: any = {};
			if (body.customer_id !== undefined) updates.customer_id = body.customer_id;
			if (body.invoice_date !== undefined) updates.invoice_date = Math.floor(new Date(body.invoice_date).getTime() / 1000);
			if (body.due_date !== undefined) updates.due_date = Math.floor(new Date(body.due_date).getTime() / 1000);
			if (body.currency !== undefined) updates.currency = body.currency;
			if (body.notes !== undefined) updates.notes = body.notes;

			// Update VAT rate if provided
			if (body.vat_rate !== undefined) {
				if (!AccountingService.validateVatRate(body.vat_rate)) {
					return new Response(JSON.stringify({ error: 'Invalid VAT rate' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				updates.vat_rate = body.vat_rate;
			}

			// Update items if provided
			if (body.items !== undefined) {
				const vatRate = updates.vat_rate ?? invoice.vat_rate;
				const { subtotal, vat_amount, total, items } = AccountingService.calculateTotals(
					body.items,
					vatRate
				);

				updates.subtotal = subtotal;
				updates.vat_amount = vat_amount;
				updates.total = total;

				await this.db.updateInvoiceItems(id, items);
			}

			const updatedInvoice = await this.db.updateInvoice(id, updates);

			// Audit log
			await this.db.createAuditLog({
				company_id: user.company_id,
				user_id: user.id,
				action: 'invoice.updated',
				resource_type: 'invoice',
				resource_id: id,
				old_values: oldValues,
				new_values: JSON.stringify(updatedInvoice),
				ip_address: this.getClientIP(request),
				user_agent: request.headers.get('User-Agent') || undefined,
			});

			return new Response(JSON.stringify(updatedInvoice), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	private async generatePDF(request: Request, id: string, user: any, env: Env): Promise<Response> {
		const invoice = await this.db.getInvoice(id);
		if (!invoice) {
			return new Response(JSON.stringify({ error: 'Invoice not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!this.authService.canViewInvoice(user, invoice)) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		try {
			const customer = await this.db.getCustomer(invoice.customer_id);
			const company = await this.db.getCompany(invoice.company_id);

			if (!customer || !company) {
				return new Response(JSON.stringify({ error: 'Customer or company not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Determine PDF mode
			const mode: 'DRAFT' | 'FINAL' = invoice.status === 'draft' ? 'DRAFT' : 'FINAL';

			// Generate PDF
			const { url, sha256 } = await this.pdfService.generatePDF(invoice, customer, company, mode);

			// Update invoice with PDF info (only if FINAL)
			if (mode === 'FINAL' && invoice.status === 'sent') {
				await this.db.updateInvoice(id, {
					pdf_url: url,
					pdf_sha256: sha256,
					pdf_mode: mode,
				});
			}

			return new Response(JSON.stringify({ url, sha256, mode }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	private async sendEmail(request: Request, id: string, user: any, env: Env): Promise<Response> {
		const invoice = await this.db.getInvoice(id);
		if (!invoice) {
			return new Response(JSON.stringify({ error: 'Invoice not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!this.authService.canSendInvoice(user, invoice)) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		try {
			const body = await request.json() as any;
			const toEmail = body.to_email || (await this.db.getCustomer(invoice.customer_id))?.email;

			if (!toEmail) {
				return new Response(JSON.stringify({ error: 'Email address required' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Generate FINAL PDF if not already generated
			if (!invoice.pdf_url || invoice.pdf_mode !== 'FINAL') {
				const customer = await this.db.getCustomer(invoice.customer_id);
				const company = await this.db.getCompany(invoice.company_id);
				if (customer && company) {
					const { url, sha256 } = await this.pdfService.generatePDF(invoice, customer, company, 'FINAL');
					await this.db.updateInvoice(id, {
						pdf_url: url,
						pdf_sha256: sha256,
						pdf_mode: 'FINAL',
					});
					invoice.pdf_url = url;
					invoice.pdf_sha256 = sha256;
					invoice.pdf_mode = 'FINAL';
				}
			}

			// Create view token
			const token = crypto.randomUUID();
			const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
			await this.db.createViewToken({
				invoice_id: id,
				token,
				expires_at: expiresAt,
				view_count: 0,
			});

			// Queue email
			const emailLog = await this.emailService.queueInvoiceEmail(
				invoice,
				toEmail,
				body.subject,
				body.message,
				token
			);

			// Update invoice status
			await this.db.updateInvoice(id, {
				status: 'sent',
				sent_at: Math.floor(Date.now() / 1000),
			});

			// Audit log
			await this.db.createAuditLog({
				company_id: user.company_id,
				user_id: user.id,
				action: 'invoice.sent',
				resource_type: 'invoice',
				resource_id: id,
				new_values: JSON.stringify({ email_log_id: emailLog.id }),
				ip_address: this.getClientIP(request),
				user_agent: request.headers.get('User-Agent') || undefined,
			});

			return new Response(JSON.stringify({ 
				email_log_id: emailLog.id,
				status: emailLog.status,
				view_token: token,
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	private async getInvoice(id: string, user: any, env: Env): Promise<Response> {
		const invoice = await this.db.getInvoice(id);
		if (!invoice) {
			return new Response(JSON.stringify({ error: 'Invoice not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!this.authService.canViewInvoice(user, invoice)) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify(invoice), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	private async viewInvoice(token: string, request: Request, env: Env): Promise<Response> {
		const viewToken = await this.db.getViewTokenByToken(token);
		if (!viewToken) {
			return new Response('Invalid or expired token', { status: 404 });
		}

		if (viewToken.expires_at < Math.floor(Date.now() / 1000)) {
			return new Response('Token expired', { status: 410 });
		}

		const invoice = await this.db.getInvoice(viewToken.invoice_id);
		if (!invoice) {
			return new Response('Invoice not found', { status: 404 });
		}

		// Record view
		const ip = this.getClientIP(request);
		const userAgent = request.headers.get('User-Agent') || '';
		await this.db.recordTokenView(token, ip, userAgent);

		// Return invoice HTML view
		const customer = await this.db.getCustomer(invoice.customer_id);
		const company = await this.db.getCompany(invoice.company_id);

		if (!customer || !company) {
			return new Response('Customer or company not found', { status: 404 });
		}

		// Generate HTML view
		const html = this.generateInvoiceViewHTML(invoice, customer, company);

		return new Response(html, {
			headers: { 'Content-Type': 'text/html' },
		});
	}

	private async handlePaymentWebhook(request: Request, env: Env): Promise<Response> {
		try {
			const body = await request.json() as any;
			const provider = body.provider || request.headers.get('X-Payment-Provider');

			if (provider === 'stripe') {
				return this.handleStripeWebhook(request, body, env);
			} else if (provider === 'montonio') {
				return this.handleMontonioWebhook(request, body, env);
			}

			return new Response(JSON.stringify({ error: 'Unknown provider' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	private async handleStripeWebhook(request: Request, body: any, env: Env): Promise<Response> {
		// Verify Stripe webhook signature
		// In production, verify the signature using Stripe's SDK

		const eventType = body.type;
		const paymentIntent = body.data?.object;

		if (eventType === 'payment_intent.succeeded') {
			const invoiceId = paymentIntent.metadata?.invoice_id;
			if (invoiceId) {
				const invoice = await this.db.getInvoice(invoiceId);
				if (invoice && invoice.status === 'sent') {
					await this.db.updateInvoice(invoiceId, {
						status: 'paid',
						paid_at: Math.floor(Date.now() / 1000),
					});

					await this.db.createAuditLog({
						company_id: invoice.company_id,
						action: 'invoice.paid',
						resource_type: 'invoice',
						resource_id: invoiceId,
						new_values: JSON.stringify({ payment_intent_id: paymentIntent.id }),
					});
				}
			}
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	private async handleMontonioWebhook(request: Request, body: any, env: Env): Promise<Response> {
		// Verify Montonio webhook signature
		// In production, verify the signature

		const status = body.status;
		const invoiceId = body.metadata?.invoice_id;

		if (status === 'COMPLETED' && invoiceId) {
			const invoice = await this.db.getInvoice(invoiceId);
			if (invoice && invoice.status === 'sent') {
				await this.db.updateInvoice(invoiceId, {
					status: 'paid',
					paid_at: Math.floor(Date.now() / 1000),
				});

				await this.db.createAuditLog({
					company_id: invoice.company_id,
					action: 'invoice.paid',
					resource_type: 'invoice',
					resource_id: invoiceId,
					new_values: JSON.stringify({ transaction_id: body.transaction_id }),
				});
			}
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	private generateInvoiceViewHTML(invoice: any, customer: any, company: any): string {
		// Generate a nice HTML view of the invoice
		return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Invoice ${invoice.invoice_number}</title>
	<style>
		body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
		.header { display: flex; justify-content: space-between; margin-bottom: 40px; }
		.invoice-number { font-size: 24px; font-weight: bold; }
		table { width: 100%; border-collapse: collapse; margin: 20px 0; }
		th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
		th { background-color: #f5f5f5; }
		.total { text-align: right; font-weight: bold; font-size: 18px; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<h2>${this.escapeHtml(company.name)}</h2>
		</div>
		<div class="invoice-number">Invoice ${invoice.invoice_number}</div>
	</div>
	<p><strong>Bill To:</strong> ${this.escapeHtml(customer.name)}</p>
	<p>Date: ${new Date(invoice.invoice_date * 1000).toLocaleDateString()}</p>
	<p>Due Date: ${new Date(invoice.due_date * 1000).toLocaleDateString()}</p>
	<table>
		<thead>
			<tr>
				<th>Description</th>
				<th>Quantity</th>
				<th>Price</th>
				<th>Total</th>
			</tr>
		</thead>
		<tbody>
			${invoice.items?.map((item: any) => `
				<tr>
					<td>${this.escapeHtml(item.description)}</td>
					<td>${item.quantity}</td>
					<td>${item.unit_price.toFixed(2)}</td>
					<td>${item.line_total_with_vat.toFixed(2)}</td>
				</tr>
			`).join('') || ''}
		</tbody>
	</table>
	<div class="total">Total: ${invoice.currency} ${invoice.total.toFixed(2)}</div>
	${invoice.payment_link ? `<p><a href="${invoice.payment_link}">Pay Now</a></p>` : ''}
</body>
</html>`;
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

	private async createCreditNote(request: Request, user: any, env: Env): Promise<Response> {
		if (!this.authService.hasPermission(user, 'accountant')) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		try {
			const body = await request.json() as any;
			
			if (!body.invoice_id || !body.reason || body.total_amount === undefined) {
				return new Response(JSON.stringify({ error: 'Missing required fields' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const invoice = await this.db.getInvoice(body.invoice_id);
			if (!invoice || invoice.company_id !== user.company_id) {
				return new Response(JSON.stringify({ error: 'Invoice not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Only allow credit notes for sent/paid invoices
			if (invoice.status === 'draft') {
				return new Response(JSON.stringify({ error: 'Cannot create credit note for draft invoice' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Validate credit amount
			if (body.total_amount > invoice.total) {
				return new Response(JSON.stringify({ error: 'Credit amount cannot exceed invoice total' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const creditDate = body.credit_date 
				? Math.floor(new Date(body.credit_date).getTime() / 1000)
				: Math.floor(Date.now() / 1000);
			const year = new Date(creditDate * 1000).getFullYear();

			// Get next credit number
			const creditNumber = await this.db.getNextCreditNumber(user.company_id, year);

			// Create credit note
			const creditNote = await this.db.createCreditNote({
				company_id: user.company_id,
				invoice_id: body.invoice_id,
				credit_number: creditNumber,
				credit_date: creditDate,
				reason: body.reason,
				total_amount: AccountingService.roundToTwoDecimals(body.total_amount),
				created_by: user.id,
			});

			// Audit log
			await this.db.createAuditLog({
				company_id: user.company_id,
				user_id: user.id,
				action: 'credit_note.created',
				resource_type: 'credit_note',
				resource_id: creditNote.id,
				new_values: JSON.stringify(creditNote),
				ip_address: this.getClientIP(request),
				user_agent: request.headers.get('User-Agent') || undefined,
			});

			return new Response(JSON.stringify(creditNote), {
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	private getClientIP(request: Request): string {
		return request.headers.get('CF-Connecting-IP') || 
		       request.headers.get('X-Forwarded-For')?.split(',')[0] || 
		       'unknown';
	}
}
