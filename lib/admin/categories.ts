import { prisma } from '@/lib/db';
import { createAuditLog } from './audit';
import { z } from 'zod';
import { slugify } from '@/lib/utils';

export const categorySchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1).optional(),
	description: z.string().optional(),
	icon: z.string().optional(),
	order: z.number().int().default(0),
	active: z.boolean().default(true),
});

export async function createCategory(
	data: z.infer<typeof categorySchema>,
	actorUserId: string,
	ip?: string,
) {
	const validated = categorySchema.parse(data);
	const slug = validated.slug || slugify(validated.name);

	const existing = await prisma.category.findUnique({
		where: { slug },
	});

	if (existing) {
		throw new Error('Category with this slug already exists');
	}

	const category = await prisma.category.create({
		data: {
			name: validated.name,
			slug,
			description: validated.description,
			icon: validated.icon,
			order: validated.order,
			active: validated.active,
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'create',
		entityType: 'category',
		entityId: category.id,
		afterJson: category,
		ip,
	});

	return category;
}

export async function updateCategory(
	categoryId: string,
	data: Partial<z.infer<typeof categorySchema>>,
	actorUserId: string,
	ip?: string,
) {
	const category = await prisma.category.findUnique({
		where: { id: categoryId },
	});

	if (!category) {
		throw new Error('Category not found');
	}

	const updateData: any = { ...data };

	if (data.name && !data.slug) {
		updateData.slug = slugify(data.name);
	}

	if (updateData.slug && updateData.slug !== category.slug) {
		const existing = await prisma.category.findUnique({
			where: { slug: updateData.slug },
		});

		if (existing) {
			throw new Error('Category with this slug already exists');
		}
	}

	const updated = await prisma.category.update({
		where: { id: categoryId },
		data: updateData,
	});

	await createAuditLog({
		actorUserId,
		action: 'update',
		entityType: 'category',
		entityId: categoryId,
		beforeJson: category,
		afterJson: updated,
		ip,
	});

	return updated;
}

export async function deleteCategory(categoryId: string, actorUserId: string, ip?: string) {
	const category = await prisma.category.findUnique({
		where: { id: categoryId },
	});

	if (!category) {
		throw new Error('Category not found');
	}

	await prisma.category.delete({
		where: { id: categoryId },
	});

	await createAuditLog({
		actorUserId,
		action: 'delete',
		entityType: 'category',
		entityId: categoryId,
		beforeJson: category,
		ip,
	});
}
