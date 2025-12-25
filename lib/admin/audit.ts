import { prisma } from '@/lib/db';
import type { UserRole } from '@prisma/client';

export type AuditAction = 'create' | 'update' | 'delete' | 'status_change';
export type AuditEntityType =
	| 'category'
	| 'product'
	| 'locker'
	| 'compartment'
	| 'booking'
	| 'user';

interface AuditLogInput {
	actorUserId: string;
	action: AuditAction;
	entityType: AuditEntityType;
	entityId: string;
	beforeJson?: unknown;
	afterJson?: unknown;
	ip?: string;
}

export async function createAuditLog(input: AuditLogInput) {
	try {
		await prisma.auditLog.create({
			data: {
				actorUserId: input.actorUserId,
				action: input.action,
				entityType: input.entityType,
				entityId: input.entityId,
				beforeJson: input.beforeJson ? (input.beforeJson as object) : null,
				afterJson: input.afterJson ? (input.afterJson as object) : null,
				ip: input.ip,
			},
		});
	} catch (error) {
		// Log error but don't fail the operation
		console.error('Failed to create audit log:', error);
	}
}
