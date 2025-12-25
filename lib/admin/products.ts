import { prisma } from '@/lib/db';
import { createAuditLog } from './audit';
import { z } from 'zod';
import { slugify } from '@/lib/utils';

export const productSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1).optional(),
	shortDescription: z.string().optional(),
	description: z.string().optional(),
	categoryId: z.string().optional().nullable(),
	basePrice: z.number().min(0),
	priceUnit: z.enum(['hour', 'day']).default('hour'),
	slotMinutes: z.number().int().min(1).default(15),
	minRentalMinutes: z.number().int().min(1).default(60),
	maxRentalMinutes: z.number().int().min(1).optional().nullable(),
	images: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),
	active: z.boolean().default(true),
});

export async function createProduct(
	data: z.infer<typeof productSchema>,
	actorUserId: string,
	ip?: string,
) {
	const validated = productSchema.parse(data);
	const slug = validated.slug || slugify(validated.name);

	// Check slug uniqueness
	const existing = await prisma.product.findUnique({
		where: { slug },
	});

	if (existing) {
		throw new Error('Product with this slug already exists');
	}

	const product = await prisma.product.create({
		data: {
			name: validated.name,
			slug,
			shortDescription: validated.shortDescription,
			description: validated.description,
			categoryId: validated.categoryId || null,
			basePrice: validated.basePrice,
			priceUnit: validated.priceUnit,
			slotMinutes: validated.slotMinutes,
			minRentalMinutes: validated.minRentalMinutes,
			maxRentalMinutes: validated.maxRentalMinutes || null,
			images: validated.images,
			tags: validated.tags,
			active: validated.active,
		},
		include: {
			category: true,
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'create',
		entityType: 'product',
		entityId: product.id,
		afterJson: product,
		ip,
	});

	return product;
}

export async function updateProduct(
	productId: string,
	data: Partial<z.infer<typeof productSchema>>,
	actorUserId: string,
	ip?: string,
) {
	const product = await prisma.product.findUnique({
		where: { id: productId },
	});

	if (!product) {
		throw new Error('Product not found');
	}

	const updateData: any = { ...data };

	if (data.name && !data.slug) {
		updateData.slug = slugify(data.name);
	}

	if (updateData.slug && updateData.slug !== product.slug) {
		const existing = await prisma.product.findUnique({
			where: { slug: updateData.slug },
		});

		if (existing) {
			throw new Error('Product with this slug already exists');
		}
	}

	const updated = await prisma.product.update({
		where: { id: productId },
		data: updateData,
		include: {
			category: true,
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'update',
		entityType: 'product',
		entityId: productId,
		beforeJson: product,
		afterJson: updated,
		ip,
	});

	return updated;
}

export async function deleteProduct(productId: string, actorUserId: string, ip?: string) {
	const product = await prisma.product.findUnique({
		where: { id: productId },
	});

	if (!product) {
		throw new Error('Product not found');
	}

	await prisma.product.delete({
		where: { id: productId },
	});

	await createAuditLog({
		actorUserId,
		action: 'delete',
		entityType: 'product',
		entityId: productId,
		beforeJson: product,
		ip,
	});
}
