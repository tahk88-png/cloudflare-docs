import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/action";

export const compartmentCreateSchema = z.object({
	lockerId: z.string().min(1),
	label: z.string().min(1).max(16),
	productId: z.string().min(1).optional().nullable(),
	active: z.boolean().default(true),
	notes: z.string().max(2000).optional().nullable(),
});

export const compartmentUpdateSchema = compartmentCreateSchema.extend({
	id: z.string().min(1),
});

export async function listCompartments(input?: { lockerId?: string }) {
	return prisma.compartment.findMany({
		where: input?.lockerId ? { lockerId: input.lockerId } : undefined,
		orderBy: [{ locker: { name: "asc" } }, { label: "asc" }],
		include: {
			locker: true,
			product: true,
		},
	});
}

export async function createCompartment(ctx: AdminContext, input: z.infer<typeof compartmentCreateSchema>) {
	if (input.productId) {
		const product = await prisma.product.findUnique({ where: { id: input.productId } });
		if (product && !product.active && input.active) {
			throw new Error("Cannot assign an inactive product to an active compartment.");
		}
	}

	const created = await prisma.compartment.create({
		data: {
			lockerId: input.lockerId,
			label: input.label,
			productId: input.productId ?? null,
			active: input.active,
			notes: input.notes ?? null,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "compartment.create",
		entityType: "compartment",
		entityId: created.id,
		beforeJson: null,
		afterJson: created,
		ip: ctx.ip,
	});

	return created;
}

export async function updateCompartment(ctx: AdminContext, input: z.infer<typeof compartmentUpdateSchema>) {
	const before = await prisma.compartment.findUnique({ where: { id: input.id } });
	if (!before) throw new Error("Compartment not found.");

	if (input.productId) {
		const product = await prisma.product.findUnique({ where: { id: input.productId } });
		if (product && !product.active && input.active) {
			throw new Error("Cannot assign an inactive product to an active compartment.");
		}
	}

	const updated = await prisma.compartment.update({
		where: { id: input.id },
		data: {
			lockerId: input.lockerId,
			label: input.label,
			productId: input.productId ?? null,
			active: input.active,
			notes: input.notes ?? null,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "compartment.update",
		entityType: "compartment",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

export async function setCompartmentMaintenance(ctx: AdminContext, input: { id: string; notes: string }) {
	const before = await prisma.compartment.findUnique({ where: { id: input.id } });
	if (!before) throw new Error("Compartment not found.");

	const updated = await prisma.compartment.update({
		where: { id: input.id },
		data: {
			active: false,
			notes: input.notes,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "compartment.maintenance",
		entityType: "compartment",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

export async function clearCompartmentMaintenance(ctx: AdminContext, input: { id: string }) {
	const before = await prisma.compartment.findUnique({ where: { id: input.id } });
	if (!before) throw new Error("Compartment not found.");

	const updated = await prisma.compartment.update({
		where: { id: input.id },
		data: {
			active: true,
			notes: before.notes,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "compartment.maintenance_clear",
		entityType: "compartment",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

