import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/action";
import { RENTBOX_TZ } from "@/lib/timezone";

export const lockerCreateSchema = z.object({
	name: z.string().min(2).max(120),
	locationText: z.string().max(300).optional().nullable(),
	timezone: z.literal(RENTBOX_TZ).default(RENTBOX_TZ),
	active: z.boolean().default(true),
});

export const lockerUpdateSchema = lockerCreateSchema.extend({
	id: z.string().min(1),
});

export async function listLockers() {
	return prisma.locker.findMany({
		orderBy: [{ name: "asc" }],
		include: {
			_count: { select: { compartments: true } },
		},
	});
}

export async function createLocker(ctx: AdminContext, input: z.infer<typeof lockerCreateSchema>) {
	const created = await prisma.locker.create({
		data: {
			name: input.name,
			locationText: input.locationText ?? null,
			timezone: input.timezone,
			active: input.active,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "locker.create",
		entityType: "locker",
		entityId: created.id,
		beforeJson: null,
		afterJson: created,
		ip: ctx.ip,
	});

	return created;
}

export async function updateLocker(ctx: AdminContext, input: z.infer<typeof lockerUpdateSchema>) {
	const before = await prisma.locker.findUnique({ where: { id: input.id } });
	if (!before) throw new Error("Locker not found.");

	const updated = await prisma.locker.update({
		where: { id: input.id },
		data: {
			name: input.name,
			locationText: input.locationText ?? null,
			timezone: input.timezone,
			active: input.active,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "locker.update",
		entityType: "locker",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

export async function deleteLocker(ctx: AdminContext, id: string) {
	const before = await prisma.locker.findUnique({
		where: { id },
		include: { compartments: { select: { id: true } } },
	});
	if (!before) throw new Error("Locker not found.");
	if (before.compartments.length > 0) {
		throw new Error("Cannot delete a locker that has compartments.");
	}

	await prisma.locker.delete({ where: { id } });

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "locker.delete",
		entityType: "locker",
		entityId: id,
		beforeJson: before,
		afterJson: null,
		ip: ctx.ip,
	});
}

