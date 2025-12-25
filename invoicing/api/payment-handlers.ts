// Payment webhook handlers (Stripe/Montonio)

import type { D1Database } from '@cloudflare/workers-types';
import type { Invoice, PaymentWebhookPayload } from '../types';
import { generateId } from '../utils/id';
import { auditActions } from '../services/audit-service';

/**
 * POST /webhooks/payments - Handle payment webhooks from Stripe/Montonio
 */
export async function handlePaymentWebhook(
  db: D1Database,
  request: Request,
  body: PaymentWebhookPayload
): Promise<Response> {
  try {
    // Log webhook event
    const webhookId = generateId('webhook');
    
    await db
      .prepare(
        `INSERT INTO payment_webhooks (
          id, invoice_id, provider, event_type, event_id, payload, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        webhookId,
        body.invoice_id || null,
        body.provider,
        body.event_type,
        body.event_id,
        JSON.stringify(body),
        'pending'
      )
      .run();
    
    // Process webhook based on provider and event type
    let processed = false;
    let errorMessage: string | undefined;
    
    try {
      if (body.provider === 'stripe') {
        processed = await processStripeWebhook(db, body);
      } else if (body.provider === 'montonio') {
        processed = await processMontonioWebhook(db, body);
      } else {
        throw new Error(`Unknown payment provider: ${body.provider}`);
      }
      
      // Mark webhook as processed
      await db
        .prepare(
          `UPDATE payment_webhooks 
           SET status = 'processed', processed_at = datetime('now')
           WHERE id = ?`
        )
        .bind(webhookId)
        .run();
      
    } catch (error: any) {
      errorMessage = error.message;
      
      // Mark webhook as failed
      await db
        .prepare(
          `UPDATE payment_webhooks 
           SET status = 'failed', error_message = ?
           WHERE id = ?`
        )
        .bind(errorMessage, webhookId)
        .run();
      
      console.error('Webhook processing failed:', error);
    }
    
    return jsonResponse({
      webhook_id: webhookId,
      processed,
      error: errorMessage,
    });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return jsonError(error.message, 500);
  }
}

/**
 * Process Stripe webhook
 */
async function processStripeWebhook(
  db: D1Database,
  payload: PaymentWebhookPayload
): Promise<boolean> {
  // Stripe payment events
  switch (payload.event_type) {
    case 'payment_intent.succeeded':
    case 'charge.succeeded':
      return await handlePaymentSuccess(db, payload);
    
    case 'payment_intent.payment_failed':
    case 'charge.failed':
      return await handlePaymentFailed(db, payload);
    
    case 'payment_intent.canceled':
      return await handlePaymentCanceled(db, payload);
    
    default:
      console.log(`Unhandled Stripe event: ${payload.event_type}`);
      return false;
  }
}

/**
 * Process Montonio webhook
 */
async function processMontonioWebhook(
  db: D1Database,
  payload: PaymentWebhookPayload
): Promise<boolean> {
  // Montonio payment events
  switch (payload.event_type) {
    case 'payment.completed':
    case 'payment.approved':
      return await handlePaymentSuccess(db, payload);
    
    case 'payment.failed':
    case 'payment.declined':
      return await handlePaymentFailed(db, payload);
    
    case 'payment.canceled':
      return await handlePaymentCanceled(db, payload);
    
    default:
      console.log(`Unhandled Montonio event: ${payload.event_type}`);
      return false;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(
  db: D1Database,
  payload: PaymentWebhookPayload
): Promise<boolean> {
  if (!payload.invoice_id) {
    console.error('No invoice_id in payment webhook');
    return false;
  }
  
  // Get invoice
  const invoice = await db
    .prepare('SELECT * FROM invoices WHERE id = ?')
    .bind(payload.invoice_id)
    .first<Invoice>();
  
  if (!invoice) {
    console.error(`Invoice not found: ${payload.invoice_id}`);
    return false;
  }
  
  // Calculate payment amount
  const paymentAmount = payload.amount || invoice.total;
  const newPaidAmount = invoice.paid_amount + paymentAmount;
  
  // Determine new status
  let newStatus = invoice.status;
  if (newPaidAmount >= invoice.total) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'payment_pending';
  }
  
  // Update invoice
  await db
    .prepare(
      `UPDATE invoices 
       SET status = ?,
           paid_amount = ?,
           paid_date = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_date END,
           payment_method = ?,
           payment_reference = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(
      newStatus,
      newPaidAmount,
      newStatus,
      payload.provider,
      payload.payment_reference || payload.event_id,
      payload.invoice_id
    )
    .run();
  
  // Audit log
  await auditActions.invoice.paid(
    db,
    invoice.company_id,
    payload.invoice_id,
    paymentAmount,
    payload.provider,
    payload.payment_reference || payload.event_id
  );
  
  return true;
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  db: D1Database,
  payload: PaymentWebhookPayload
): Promise<boolean> {
  if (!payload.invoice_id) {
    return false;
  }
  
  // Log the failure (could trigger notification to customer)
  console.log(`Payment failed for invoice ${payload.invoice_id}:`, payload);
  
  // Could update invoice to reflect payment attempt
  // For now, just log it
  
  return true;
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(
  db: D1Database,
  payload: PaymentWebhookPayload
): Promise<boolean> {
  if (!payload.invoice_id) {
    return false;
  }
  
  console.log(`Payment canceled for invoice ${payload.invoice_id}`);
  
  return true;
}

/**
 * Generate Stripe payment link for invoice
 */
export async function generateStripePaymentLink(
  db: D1Database,
  invoiceId: string,
  stripeApiKey: string
): Promise<string> {
  // Get invoice
  const invoice = await db
    .prepare('SELECT * FROM invoices WHERE id = ?')
    .bind(invoiceId)
    .first<Invoice>();
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  // In production, call Stripe API to create payment link
  // For now, return a placeholder
  const paymentLink = `https://checkout.stripe.com/pay/inv_${invoice.invoice_number}`;
  
  // Update invoice with payment link
  await db
    .prepare(
      `UPDATE invoices 
       SET payment_link = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(paymentLink, invoiceId)
    .run();
  
  return paymentLink;
}

/**
 * Generate Montonio payment link for invoice
 */
export async function generateMontonioPaymentLink(
  db: D1Database,
  invoiceId: string,
  montonioApiKey: string
): Promise<string> {
  // Get invoice
  const invoice = await db
    .prepare('SELECT * FROM invoices WHERE id = ?')
    .bind(invoiceId)
    .first<Invoice>();
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  // In production, call Montonio API to create payment link
  // For now, return a placeholder
  const paymentLink = `https://payments.montonio.com/invoice/${invoice.invoice_number}`;
  
  // Update invoice with payment link
  await db
    .prepare(
      `UPDATE invoices 
       SET payment_link = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(paymentLink, invoiceId)
    .run();
  
  return paymentLink;
}

/**
 * Helper functions
 */
function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
