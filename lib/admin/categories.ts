import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/action";

export const categoryCreateSchema = z.object({
	name: z.string().min(2).max(80),
	slug: z
		.string()
		.min(2)
		.max(80)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case."),
	description: z.string().max(2000).optional().nullable(),
	icon: z.string().max(200).optional().nullable(),
	order: z.number().int().min(0).max(10_000).default(0),
	active: z.boolean().default(true),
});

export const categoryUpdateSchema = categoryCreateSchema.extend({
	id: z.string().min(1),
});

export async function listCategories() {
	return prisma.category.findMany({
		orderBy: [{ order: "asc" }, { name: "asc" }],
	});
}

export async function createCategory(ctx: AdminContext, input: z.infer<typeof categoryCreateSchema>) {
	const created = await prisma.category.create({
		data: {
			name: input.name,
			slug: input.slug,
			description: input.description ?? null,
			icon: input.icon ?? null,
			order: input.order,
			active: input.active,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "category.create",
		entityType: "category",
		entityId: created.id,
		beforeJson: null,
		afterJson: created,
		ip: ctx.ip,
	});

	return created;
}

export async function updateCategory(ctx: AdminContext, input: z.infer<typeof categoryUpdateSchema>) {
	const before = await prisma.category.findUnique({ where: { id: input.id } });
	if (!before) throw new Error("Category not found.");

	const updated = await prisma.category.update({
		where: { id: input.id },
		data: {
			name: input.name,
			slug: input.slug,
			description: input.description ?? null,
			icon: input.icon ?? null,
			order: input.order,
			active: input.active,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "category.update",
		entityType: "category",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

export async function moveCategory(ctx: AdminContext, id: string, direction: "up" | "down") {
	const categories = await prisma.category.findMany({
		orderBy: [{ order: "asc" }, { name: "asc" }],
	});
	const idx = categories.findIndex((c) => c.id === id);
	if (idx === -1) throw new Error("Category not found.");

	const swapWith = direction === "up" ? idx - 1 : idx + 1;
	if (swapWith < 0 || swapWith >= categories.length) return categories[idx]!;

	const a = categories[idx]!;
	const b = categories[swapWith]!;

	const [aNew, bNew] = await prisma.$transaction([
		prisma.category.update({ where: { id: a.id }, data: { order: b.order } }),
		prisma.category.update({ where: { id: b.id }, data: { order: a.order } }),
	]);

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "category.reorder",
		entityType: "category",
		entityId: a.id,
		beforeJson: { a, b },
		afterJson: { a: aNew, b: bNew },
		ip: ctx.ip,
	});

	return aNew;
}

export async function deleteCategory(ctx: AdminContext, id: string) {
	const before = await prisma.category.findUnique({
		where: { id },
		include: { products: { select: { id: true } } },
	});
	if (!before) throw new Error("Category not found.");
	if (before.products.length > 0) {
		throw new Error("Cannot delete a category that still has products.");
	}

	await prisma.category.delete({ where: { id } });

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "category.delete",
		entityType: "category",
		entityId: id,
		beforeJson: before,
		afterJson: null,
		ip: ctx.ip,
	});
}

