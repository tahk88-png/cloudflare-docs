import prisma from "@/lib/db/prisma";
import { headers } from "next/headers";
import type { AuditLogWithRelations } from "@/lib/types";

export type AuditAction = "create" | "update" | "delete" | "status_change" | "login" | "logout";

export type AuditEntityType = 
  | "booking"
  | "product"
  | "category"
  | "locker"
  | "compartment"
  | "user"
  | "setting"
  | "tag";

interface CreateAuditLogParams {
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const headersList = await headers();
  const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || null;
  const userAgent = headersList.get("user-agent") || null;

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeJson: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
      afterJson: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
      ipAddress,
      userAgent,
    },
  });
}

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  actorUserId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{
  items: AuditLogWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(params.actorUserId && { actorUserId: params.actorUserId }),
    ...(params.entityType && { entityType: params.entityType }),
    ...(params.entityId && { entityId: params.entityId }),
    ...(params.action && { action: params.action }),
    ...(params.dateFrom || params.dateTo
      ? {
          createdAt: {
            ...(params.dateFrom && { gte: params.dateFrom }),
            ...(params.dateTo && { lte: params.dateTo }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items as AuditLogWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Helper to create before/after diff objects
 */
export function createAuditDiff<T extends Record<string, unknown>>(
  before: T | null,
  after: T | null
): { before: Record<string, unknown> | null; after: Record<string, unknown> | null } {
  // Remove sensitive fields
  const sanitizeObject = (obj: T | null): Record<string, unknown> | null => {
    if (!obj) return null;
    const sanitized = { ...obj };
    delete sanitized.passwordHash;
    delete sanitized.password;
    return sanitized;
  };

  return {
    before: sanitizeObject(before),
    after: sanitizeObject(after),
  };
}
