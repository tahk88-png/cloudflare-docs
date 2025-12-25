'use server';

import { revalidatePath } from 'next/cache';
import { createProduct, updateProduct, deleteProduct } from '@/lib/admin/products';
import { requireAuth } from '@/lib/auth/requireRole';
import { requireRole } from '@/lib/auth/requireRole';

export async function createProductAction(formData: FormData) {
	const user = await requireRole(['owner', 'admin']);

	try {
		const data = {
			name: formData.get('name') as string,
			slug: formData.get('slug') as string | undefined,
			shortDescription: formData.get('shortDescription') as string | undefined,
			description: formData.get('description') as string | undefined,
			categoryId: formData.get('categoryId') as string | undefined,
			basePrice: parseFloat(formData.get('basePrice') as string),
			priceUnit: (formData.get('priceUnit') as 'hour' | 'day') || 'hour',
			slotMinutes: parseInt(formData.get('slotMinutes') as string) || 15,
			minRentalMinutes: parseInt(formData.get('minRentalMinutes') as string) || 60,
			maxRentalMinutes: formData.get('maxRentalMinutes')
				? parseInt(formData.get('maxRentalMinutes') as string)
				: undefined,
			images: JSON.parse(formData.get('images') as string || '[]'),
			tags: JSON.parse(formData.get('tags') as string || '[]'),
			active: formData.get('active') === 'true',
		};

		await createProduct(data, user.id);
		revalidatePath('/admin/products');
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create product',
		};
	}
}

export async function updateProductAction(productId: string, formData: FormData) {
	const user = await requireRole(['owner', 'admin']);

	try {
		const data: any = {};
		if (formData.get('name')) data.name = formData.get('name') as string;
		if (formData.get('slug')) data.slug = formData.get('slug') as string;
		if (formData.get('basePrice'))
			data.basePrice = parseFloat(formData.get('basePrice') as string);
		if (formData.get('active') !== null)
			data.active = formData.get('active') === 'true';

		await updateProduct(productId, data, user.id);
		revalidatePath('/admin/products');
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update product',
		};
	}
}

export async function deleteProductAction(productId: string) {
	const user = await requireRole(['owner', 'admin']);

	try {
		await deleteProduct(productId, user.id);
		revalidatePath('/admin/products');
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete product',
		};
	}
}
