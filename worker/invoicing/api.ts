import { invoiceService } from './services/invoice';
import { db } from './db';
import { InvoiceItem } from './types';

// Simple mock auth middleware
async function getAuth(request: Request) {
    const userId = request.headers.get('x-user-id');
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!userId || !tenantId) {
        // For testing/demo purposes, default to seed data if not provided
        return { userId: 'user-1', tenantId: 'default-tenant' };
    }
    
    return { userId, tenantId };
}

export async function handleInvoicingRequest(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
        // GET /api/invoice-view/:token
        if (path.startsWith('/api/invoice-view/')) {
            if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
            const token = path.split('/').pop()!;
            const invoice = await invoiceService.getViewByToken(token, request);
            return Response.json(invoice);
        }

        // Auth required for other endpoints
        const { userId, tenantId } = await getAuth(request);

        // POST /api/invoices
        if (path === '/api/invoices' && request.method === 'POST') {
            const body = await request.json() as any;
            // Validate input
            if (!body.customerId || !body.items || !body.dueDate) {
                return new Response('Missing required fields', { status: 400 });
            }
            const invoice = await invoiceService.create(tenantId, userId, {
                customerId: body.customerId,
                items: body.items as InvoiceItem[],
                dueDate: body.dueDate,
                notes: body.notes
            });
            return Response.json(invoice, { status: 201 });
        }
        
        // Match /api/invoices/:id
        const invoiceMatch = path.match(/^\/api\/invoices\/([^\/]+)$/);
        if (invoiceMatch) {
            const invoiceId = invoiceMatch[1];
            
            if (request.method === 'GET') {
                const invoice = await db.invoices.get(invoiceId);
                if (!invoice || invoice.tenantId !== tenantId) {
                    return new Response('Not Found', { status: 404 });
                }
                return Response.json(invoice);
            }
            
            if (request.method === 'PUT') {
                 const body = await request.json() as any;
                 const updated = await invoiceService.update(invoiceId, tenantId, userId, body);
                 return Response.json(updated);
            }
        }
        
        // POST /api/invoices/:id/send
        const sendMatch = path.match(/^\/api\/invoices\/([^\/]+)\/send$/);
        if (sendMatch && request.method === 'POST') {
            const invoiceId = sendMatch[1];
            const result = await invoiceService.finalizeAndSend(invoiceId, tenantId, userId);
            return Response.json(result);
        }

        return null; // Not handled by invoicing
    } catch (e: any) {
        console.error('Invoicing API Error:', e);
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handlePaymentWebhook(request: Request): Promise<Response> {
    try {
        const body = await request.json() as any;
        // Mock Stripe event
        if (body.type === 'invoice.payment_succeeded') {
            const invoiceId = body.data.object.metadata.invoice_id; // assuming metadata
            if (invoiceId) {
                await db.invoices.update(invoiceId, { 
                    status: 'PAID', 
                    paidAt: new Date().toISOString() 
                });
                console.log(`Invoice ${invoiceId} marked as PAID via webhook`);
            }
        }
        return new Response('OK');
    } catch (e) {
        console.error('Webhook Error:', e);
        return new Response('Webhook Error', { status: 400 });
    }
}
