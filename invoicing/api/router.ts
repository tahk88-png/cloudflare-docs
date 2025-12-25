// Main API router

import type { D1Database } from '@cloudflare/workers-types';
import type { EmailProvider } from '../services/email-service';
import { createInvoice, getInvoice, updateInvoice } from './invoice-handlers';
import { generatePDF } from './pdf-handlers';
import { sendInvoiceEmail } from './email-handlers';
import { viewInvoiceByToken } from './view-handlers';
import { handlePaymentWebhook } from './payment-handlers';
import { createCreditNote } from './credit-note-handlers';

export interface RouterContext {
  db: D1Database;
  r2: any; // R2Bucket
  emailProvider: EmailProvider;
}

/**
 * Main API router
 */
export async function handleRequest(
  request: Request,
  ctx: RouterContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    let response: Response;
    
    // Route matching
    if (path === '/api/invoices' && method === 'POST') {
      const body = await request.json();
      response = await createInvoice(ctx.db, ctx.r2, request, body);
      
    } else if (path.match(/^\/api\/invoices\/[^\/]+$/) && method === 'GET') {
      const invoiceId = path.split('/').pop()!;
      response = await getInvoice(ctx.db, request, invoiceId);
      
    } else if (path.match(/^\/api\/invoices\/[^\/]+$/) && method === 'PUT') {
      const invoiceId = path.split('/').pop()!;
      const body = await request.json();
      response = await updateInvoice(ctx.db, request, invoiceId, body);
      
    } else if (path.match(/^\/api\/invoices\/[^\/]+\/generate-pdf$/) && method === 'POST') {
      const parts = path.split('/');
      const invoiceId = parts[parts.length - 2];
      const body = await request.json();
      response = await generatePDF(ctx.db, ctx.r2, request, invoiceId, body);
      
    } else if (path.match(/^\/api\/invoices\/[^\/]+\/send-email$/) && method === 'POST') {
      const parts = path.split('/');
      const invoiceId = parts[parts.length - 2];
      const body = await request.json();
      response = await sendInvoiceEmail(ctx.db, ctx.emailProvider, request, invoiceId, body);
      
    } else if (path.match(/^\/api\/invoices\/[^\/]+\/credit-note$/) && method === 'POST') {
      const parts = path.split('/');
      const invoiceId = parts[parts.length - 2];
      const body = await request.json();
      response = await createCreditNote(ctx.db, ctx.r2, request, invoiceId, body);
      
    } else if (path.match(/^\/invoice-view\/[^\/]+$/) && method === 'GET') {
      const token = path.split('/').pop()!;
      response = await viewInvoiceByToken(ctx.db, request, token);
      
    } else if (path === '/webhooks/payments' && method === 'POST') {
      const body = await request.json();
      response = await handlePaymentWebhook(ctx.db, request, body);
      
    } else if (path === '/api/health' && method === 'GET') {
      response = new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
    } else {
      response = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error: any) {
    console.error('Router error:', error);
    
    const response = new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
}
