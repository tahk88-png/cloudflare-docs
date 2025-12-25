// Secure invoice view token service

import type { D1Database } from '@cloudflare/workers-types';
import type { InvoiceViewToken } from '../types';
import { generateId, generateSecureToken } from '../utils/id';
import { auditActions } from './audit-service';

/**
 * Generate a secure view token for an invoice
 * Token is time-limited (default 30 days)
 */
export async function generateViewToken(
  db: D1Database,
  invoiceId: string,
  expiryHours: number = 30 * 24 // 30 days
): Promise<InvoiceViewToken> {
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  
  const viewToken: InvoiceViewToken = {
    id: generateId('view_token'),
    invoice_id: invoiceId,
    token,
    expires_at: expiresAt.toISOString(),
    is_used: false,
    view_count: 0,
    created_at: new Date().toISOString(),
  };
  
  await db
    .prepare(
      `INSERT INTO invoice_view_tokens (
        id, invoice_id, token, expires_at, is_used, view_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      viewToken.id,
      viewToken.invoice_id,
      viewToken.token,
      viewToken.expires_at,
      viewToken.is_used ? 1 : 0,
      viewToken.view_count,
      viewToken.created_at
    )
    .run();
  
  return viewToken;
}

/**
 * Verify and track view token usage
 */
export async function verifyViewToken(
  db: D1Database,
  token: string,
  request: Request
): Promise<{
  valid: boolean;
  invoiceId?: string;
  error?: string;
}> {
  // Get token
  const viewToken = await db
    .prepare(
      `SELECT * FROM invoice_view_tokens WHERE token = ?`
    )
    .bind(token)
    .first<InvoiceViewToken>();
  
  if (!viewToken) {
    return { valid: false, error: 'Invalid token' };
  }
  
  // Check expiry
  const now = new Date();
  const expiresAt = new Date(viewToken.expires_at);
  
  if (now > expiresAt) {
    return { valid: false, error: 'Token expired' };
  }
  
  // Track the view
  const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  
  await db
    .prepare(
      `UPDATE invoice_view_tokens
       SET is_used = 1,
           viewed_at = datetime('now'),
           viewer_ip = ?,
           viewer_user_agent = ?,
           view_count = view_count + 1
       WHERE id = ?`
    )
    .bind(ipAddress, userAgent, viewToken.id)
    .run();
  
  // Update invoice view tracking
  await db
    .prepare(
      `UPDATE invoices
       SET viewed_at = COALESCE(viewed_at, datetime('now')),
           view_count = view_count + 1,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(viewToken.invoice_id)
    .run();
  
  // Get invoice to get company_id for audit log
  const invoice = await db
    .prepare('SELECT company_id FROM invoices WHERE id = ?')
    .bind(viewToken.invoice_id)
    .first<{ company_id: string }>();
  
  if (invoice) {
    // Audit log
    await auditActions.invoice.viewed(
      db,
      invoice.company_id,
      viewToken.invoice_id,
      request
    );
  }
  
  return { valid: true, invoiceId: viewToken.invoice_id };
}

/**
 * Get view token for an invoice
 */
export async function getViewToken(
  db: D1Database,
  invoiceId: string
): Promise<InvoiceViewToken | null> {
  const token = await db
    .prepare(
      `SELECT * FROM invoice_view_tokens
       WHERE invoice_id = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(invoiceId)
    .first<InvoiceViewToken>();
  
  return token || null;
}

/**
 * Generate view URL for an invoice
 */
export function generateViewUrl(token: string, baseUrl: string = 'https://invoices.example.com'): string {
  return `${baseUrl}/invoice-view/${token}`;
}

/**
 * Revoke/invalidate a view token
 */
export async function revokeViewToken(
  db: D1Database,
  tokenId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE invoice_view_tokens
       SET expires_at = datetime('now')
       WHERE id = ?`
    )
    .bind(tokenId)
    .run();
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(
  db: D1Database
): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM invoice_view_tokens
       WHERE expires_at < datetime('now', '-30 days')`
    )
    .run();
  
  return result.meta?.changes || 0;
}
