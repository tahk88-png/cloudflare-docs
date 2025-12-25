import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ROLE_CHANGE'
  | 'MAINTENANCE_SET'
  | 'MAINTENANCE_CLEAR';

export type EntityType =
  | 'user'
  | 'category'
  | 'product'
  | 'locker'
  | 'compartment'
  | 'booking'
  | 'settings';

interface AuditLogData {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('Audit log attempted without authenticated user');
      return null;
    }

    return await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        beforeJson: data.before ? JSON.parse(JSON.stringify(data.before)) : null,
        afterJson: data.after ? JSON.parse(JSON.stringify(data.after)) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
}

/**
 * Log entity creation
 */
export async function logCreate(
  entityType: EntityType,
  entityId: string,
  after: any,
  metadata?: { ipAddress?: string; userAgent?: string }
) {
  return createAuditLog({
    action: 'CREATE',
    entityType,
    entityId,
    after,
    ...metadata,
  });
}

/**
 * Log entity update
 */
export async function logUpdate(
  entityType: EntityType,
  entityId: string,
  before: any,
  after: any,
  metadata?: { ipAddress?: string; userAgent?: string }
) {
  return createAuditLog({
    action: 'UPDATE',
    entityType,
    entityId,
    before,
    after,
    ...metadata,
  });
}

/**
 * Log entity deletion
 */
export async function logDelete(
  entityType: EntityType,
  entityId: string,
  before: any,
  metadata?: { ipAddress?: string; userAgent?: string }
) {
  return createAuditLog({
    action: 'DELETE',
    entityType,
    entityId,
    before,
    ...metadata,
  });
}

/**
 * Log status change
 */
export async function logStatusChange(
  entityType: EntityType,
  entityId: string,
  before: any,
  after: any,
  metadata?: { ipAddress?: string; userAgent?: string }
) {
  return createAuditLog({
    action: 'STATUS_CHANGE',
    entityType,
    entityId,
    before,
    after,
    ...metadata,
  });
}

/**
 * Get audit logs for an entity
 */
export async function getEntityAuditLogs(entityType: EntityType, entityId: string) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      actorUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(limit: number = 100) {
  return prisma.auditLog.findMany({
    take: limit,
    include: {
      actorUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
