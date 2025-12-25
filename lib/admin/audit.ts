import "server-only";

import { prisma } from "@/lib/db/prisma";

export type AuditWriteInput = {
	actorUserId?: string;
	action: string;
	entityType: string;
	entityId: string;
	beforeJson?: unknown;
	afterJson?: unknown;
	ip?: string;
};

export async function writeAuditLog(input: AuditWriteInput) {
	await prisma.auditLog.create({
		data: {
			actorUserId: input.actorUserId ?? null,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId,
			beforeJson: input.beforeJson as any,
			afterJson: input.afterJson as any,
			ip: input.ip ?? null,
		},
	});
}

