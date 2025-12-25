import { db } from '../db';
import { AuditLog } from '../types';
import { generateId, now } from '../utils/common';

export const auditService = {
  log: async (
    tenantId: string,
    userId: string,
    action: string,
    resourceType: AuditLog['resourceType'],
    resourceId: string,
    details?: any,
    request?: Request
  ) => {
    const log: AuditLog = {
      id: generateId(),
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      details,
      timestamp: now(),
      userAgent: request?.headers.get('User-Agent') || undefined,
      ipAddress: request?.headers.get('CF-Connecting-IP') || undefined,
    };
    await db.auditLogs.create(log);
  },
};
