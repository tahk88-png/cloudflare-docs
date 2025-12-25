import "server-only";

import { z } from "zod";
import { PriceUnit } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/action";

export const productCreateSchema = z.object({
	name: z.string().min(2).max(120),
	slug: z
		.string()
		.min(2)
		.max(120)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case."),
	shortDescription: z.string().max(200).optional().nullable(),
	description: z.string().max(10_000).optional().nullable(),
	categoryId: z.string().min(1),
	basePrice: z.number().int().min(0),
	priceUnit: z.nativeEnum(PriceUnit),
	slotMinutes: z.number().int().min(5).max(240).default(15),
	minRentalMinutes: z.number().int().min(5).max(24 * 60).default(60),
	maxRentalMinutes: z.number().int().min(5).max(30 * 24 * 60).optional().nullable(),
	active: z.boolean().default(true),
	tagNames: z.array(z.string().min(1).max(50)).default([]),
	imageUrls: z.array(z.string().url().max(2000)).default([]),
});

export const productUpdateSchema = productCreateSchema.extend({
	id: z.string().min(1),
});

export async function listProducts(input?: { q?: string; page?: number; pageSize?: number }) {
	const pageSize = Math.min(Math.max(input?.pageSize ?? 20, 1), 100);
	const page = Math.max(input?.page ?? 1, 1);
	const q = input?.q?.trim();

	const where = q
		? {
				OR: [
					{ name: { contains: q, mode: "insensitive" as const } },
					{ slug: { contains: q, mode: "insensitive" as const } },
				],
			}
		: undefined;

	const [total, items] = await prisma.$transaction([
		prisma.product.count({ where }),
		prisma.product.findMany({
			where,
			orderBy: [{ updatedAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				category: true,
				_count: { select: { compartments: true } },
			},
		}),
	]);

	return { total, page, pageSize, items };
}

async function upsertTagsByName(tagNames: string[]) {
	const normalized = Array.from(
		new Set(
			tagNames
				.map((t) => t.trim())
				.filter(Boolean)
				.map((t) => t.toLowerCase()),
		),
	);
	if (normalized.length === 0) return [];

	const existing = await prisma.tag.findMany({ where: { slug: { in: normalized } } });
	const existingBySlug = new Map(existing.map((t) => [t.slug, t]));

	const toCreate = normalized.filter((s) => !existingBySlug.has(s));
	if (toCreate.length > 0) {
		await prisma.tag.createMany({
			data: toCreate.map((slug) => ({
				slug,
				name: slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
				active: true,
			})),
			skipDuplicates: true,
		});
	}

	return prisma.tag.findMany({ where: { slug: { in: normalized } }, orderBy: { name: "asc" } });
}

export async function createProduct(ctx: AdminContext, input: z.infer<typeof productCreateSchema>) {
	const tags = await upsertTagsByName(input.tagNames);

	const created = await prisma.product.create({
		data: {
			name: input.name,
			slug: input.slug,
			shortDescription: input.shortDescription ?? null,
			description: input.description ?? null,
			categoryId: input.categoryId,
			basePrice: input.basePrice,
			priceUnit: input.priceUnit,
			slotMinutes: input.slotMinutes,
			minRentalMinutes: input.minRentalMinutes,
			maxRentalMinutes: input.maxRentalMinutes ?? null,
			active: input.active,
			productTags: {
				create: tags.map((t) => ({ tagId: t.id })),
			},
			images: {
				create: input.imageUrls.map((url, idx) => ({
					url,
					order: idx,
					isPrimary: idx === 0,
				})),
			},
		},
		include: { productTags: true, images: true },
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "product.create",
		entityType: "product",
		entityId: created.id,
		beforeJson: null,
		afterJson: created,
		ip: ctx.ip,
	});

	return created;
}

export async function updateProduct(ctx: AdminContext, input: z.infer<typeof productUpdateSchema>) {
	const before = await prisma.product.findUnique({
		where: { id: input.id },
		include: { productTags: { include: { tag: true } }, images: true },
	});
	if (!before) throw new Error("Product not found.");

	const tags = await upsertTagsByName(input.tagNames);

	const updated = await prisma.$transaction(async (tx) => {
		await tx.productTag.deleteMany({ where: { productId: input.id } });
		await tx.productImage.deleteMany({ where: { productId: input.id } });

		return tx.product.update({
			where: { id: input.id },
			data: {
				name: input.name,
				slug: input.slug,
				shortDescription: input.shortDescription ?? null,
				description: input.description ?? null,
				categoryId: input.categoryId,
				basePrice: input.basePrice,
				priceUnit: input.priceUnit,
				slotMinutes: input.slotMinutes,
				minRentalMinutes: input.minRentalMinutes,
				maxRentalMinutes: input.maxRentalMinutes ?? null,
				active: input.active,
				productTags: { create: tags.map((t) => ({ tagId: t.id })) },
				images: {
					create: input.imageUrls.map((url, idx) => ({
						url,
						order: idx,
						isPrimary: idx === 0,
					})),
				},
			},
			include: { productTags: { include: { tag: true } }, images: true },
		});
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "product.update",
		entityType: "product",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

export async function deleteProduct(ctx: AdminContext, id: string) {
	const before = await prisma.product.findUnique({
		where: { id },
		include: { compartments: { select: { id: true } }, bookings: { select: { id: true } } },
	});
	if (!before) throw new Error("Product not found.");
	if (before.compartments.length > 0) {
		throw new Error("Cannot delete a product that is assigned to compartments.");
	}
	if (before.bookings.length > 0) {
		throw new Error("Cannot delete a product that has bookings.");
	}

	await prisma.product.delete({ where: { id } });

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "product.delete",
		entityType: "product",
		entityId: id,
		beforeJson: before,
		afterJson: null,
		ip: ctx.ip,
	});
}

