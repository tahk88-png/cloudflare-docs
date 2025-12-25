// Audit logging service for full accountability

import type { D1Database } from '@cloudflare/workers-types';
import type { AuditLog, UserRole } from '../types';
import { generateId } from '../utils/id';

export interface AuditLogEntry {
  companyId: string;
  userId?: string;
  resourceType: string;
  resourceId: string;
  action: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event
 */
export async function logAudit(
  db: D1Database,
  entry: AuditLogEntry
): Promise<void> {
  const auditLog: AuditLog = {
    id: generateId('audit'),
    company_id: entry.companyId,
    user_id: entry.userId,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    action: entry.action,
    changes: entry.changes,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
    metadata: entry.metadata,
    created_at: new Date().toISOString(),
  };
  
  await db
    .prepare(
      `INSERT INTO audit_logs (
        id, company_id, user_id, resource_type, resource_id, action,
        changes, ip_address, user_agent, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      auditLog.id,
      auditLog.company_id,
      auditLog.user_id || null,
      auditLog.resource_type,
      auditLog.resource_id,
      auditLog.action,
      auditLog.changes ? JSON.stringify(auditLog.changes) : null,
      auditLog.ip_address || null,
      auditLog.user_agent || null,
      auditLog.metadata ? JSON.stringify(auditLog.metadata) : null,
      auditLog.created_at
    )
    .run();
}

/**
 * Get audit logs for a resource
 */
export async function getAuditLogs(
  db: D1Database,
  resourceType: string,
  resourceId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const result = await db
    .prepare(
      `SELECT * FROM audit_logs 
       WHERE resource_type = ? AND resource_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(resourceType, resourceId, limit)
    .all<AuditLog>();
  
  return result.results || [];
}

/**
 * Get audit logs for a company
 */
export async function getCompanyAuditLogs(
  db: D1Database,
  companyId: string,
  options?: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AuditLog[]> {
  let query = 'SELECT * FROM audit_logs WHERE company_id = ?';
  const params: any[] = [companyId];
  
  if (options?.userId) {
    query += ' AND user_id = ?';
    params.push(options.userId);
  }
  
  if (options?.resourceType) {
    query += ' AND resource_type = ?';
    params.push(options.resourceType);
  }
  
  if (options?.action) {
    query += ' AND action = ?';
    params.push(options.action);
  }
  
  if (options?.startDate) {
    query += ' AND created_at >= ?';
    params.push(options.startDate);
  }
  
  if (options?.endDate) {
    query += ' AND created_at <= ?';
    params.push(options.endDate);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(options?.limit || 100);
  
  const result = await db
    .prepare(query)
    .bind(...params)
    .all<AuditLog>();
  
  return result.results || [];
}

/**
 * Audit log helpers for common actions
 */
export const auditActions = {
  invoice: {
    created: (db: D1Database, companyId: string, userId: string, invoiceId: string, invoice: any, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        action: 'create',
        changes: { after: invoice },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    updated: (db: D1Database, companyId: string, userId: string, invoiceId: string, before: any, after: any, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        action: 'update',
        changes: { before, after },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    deleted: (db: D1Database, companyId: string, userId: string, invoiceId: string, invoice: any, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        action: 'delete',
        changes: { before: invoice },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    sent: (db: D1Database, companyId: string, userId: string, invoiceId: string, recipient: string, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        action: 'send',
        metadata: { recipient },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    viewed: (db: D1Database, companyId: string, invoiceId: string, request: Request) =>
      logAudit(db, {
        companyId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        action: 'view',
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    paid: (db: D1Database, companyId: string, invoiceId: string, amount: number, paymentMethod: string, paymentRef: string) =>
      logAudit(db, {
        companyId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        action: 'payment',
        metadata: { amount, paymentMethod, paymentRef },
      }),
    
    pdfGenerated: (db: D1Database, companyId: string, userId: string, invoiceId: string, mode: string, pdfUrl: string, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        action: 'pdf_generated',
        metadata: { mode, pdfUrl },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
  },
  
  customer: {
    created: (db: D1Database, companyId: string, userId: string, customerId: string, customer: any, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'customer',
        resourceId: customerId,
        action: 'create',
        changes: { after: customer },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    updated: (db: D1Database, companyId: string, userId: string, customerId: string, before: any, after: any, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'customer',
        resourceId: customerId,
        action: 'update',
        changes: { before, after },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
  },
  
  user: {
    login: (db: D1Database, companyId: string, userId: string, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'user',
        resourceId: userId,
        action: 'login',
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    logout: (db: D1Database, companyId: string, userId: string, request: Request) =>
      logAudit(db, {
        companyId,
        userId,
        resourceType: 'user',
        resourceId: userId,
        action: 'logout',
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
    
    created: (db: D1Database, companyId: string, creatorId: string, newUserId: string, role: UserRole, request: Request) =>
      logAudit(db, {
        companyId,
        userId: creatorId,
        resourceType: 'user',
        resourceId: newUserId,
        action: 'create',
        metadata: { role },
        ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
        userAgent: request.headers.get('User-Agent') || undefined,
      }),
  },
};
