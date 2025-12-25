import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/action";
import { RENTBOX_TZ } from "@/lib/timezone";

export const settingsUpdateSchema = z.object({
	defaultSlotMinutes: z.number().int().min(5).max(240),
	defaultMinRentalMinutes: z.number().int().min(5).max(24 * 60),
	timezone: z.literal(RENTBOX_TZ).default(RENTBOX_TZ),
	contactEmail: z.string().email().optional().nullable(),
	contactPhone: z.string().max(50).optional().nullable(),
});

export async function getSettings() {
	return prisma.settings.upsert({
		where: { id: 1 },
		update: {},
		create: { id: 1 },
	});
}

export async function updateSettings(ctx: AdminContext, input: z.infer<typeof settingsUpdateSchema>) {
	const before = await getSettings();
	const updated = await prisma.settings.update({
		where: { id: 1 },
		data: {
			defaultSlotMinutes: input.defaultSlotMinutes,
			defaultMinRentalMinutes: input.defaultMinRentalMinutes,
			timezone: input.timezone,
			contactEmail: input.contactEmail ?? null,
			contactPhone: input.contactPhone ?? null,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "settings.update",
		entityType: "settings",
		entityId: "1",
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

