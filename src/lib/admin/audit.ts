import { prisma } from "@/lib/prisma";

export async function createAuditLog(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: any,
  after: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        before_json: before || Prisma.JsonNull,
        after_json: after || Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

import { Prisma } from "@prisma/client";
