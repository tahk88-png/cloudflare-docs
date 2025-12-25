'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requirePermission } from '@/lib/auth/rbac';
import { logCreate, logUpdate, logDelete } from '@/lib/admin/audit';
import { revalidatePath } from 'next/cache';
import { PriceUnit } from '@prisma/client';

const productSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  name: z.string().min(1, 'Name is required'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  basePrice: z.number().positive('Price must be positive'),
  priceUnit: z.nativeEnum(PriceUnit).default(PriceUnit.DAY),
  slotMinutes: z.number().int().positive().default(15),
  minRentalMinutes: z.number().int().positive().default(60),
  maxRentalMinutes: z.number().int().positive().optional().nullable(),
  images: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export async function createProduct(data: z.infer<typeof productSchema>) {
  try {
    await requirePermission('products:create');

    const validated = productSchema.parse(data);

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug: validated.slug },
    });

    if (existing) {
      return { error: 'Slug already exists' };
    }

    const product = await prisma.product.create({
      data: validated,
    });

    await logCreate('product', product.id, product);
    revalidatePath('/admin/products');

    return { success: true, product };
  } catch (error) {
    console.error('Create product error:', error);
    if (error instanceof z.ZodError) {
      return { error: 'Validation failed', details: error.issues };
    }
    return { error: 'Failed to create product' };
  }
}

export async function updateProduct(id: string, data: Partial<z.infer<typeof productSchema>>) {
  try {
    await requirePermission('products:update');

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return { error: 'Product not found' };
    }

    // If updating slug, check uniqueness
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.product.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        return { error: 'Slug already exists' };
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    await logUpdate('product', product.id, existing, product);
    revalidatePath('/admin/products');

    return { success: true, product };
  } catch (error) {
    console.error('Update product error:', error);
    return { error: 'Failed to update product' };
  }
}

export async function deleteProduct(id: string) {
  try {
    await requirePermission('products:delete');

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        compartments: true,
        bookings: true,
      },
    });

    if (!existing) {
      return { error: 'Product not found' };
    }

    // Check if product is in use
    if (existing.compartments.length > 0) {
      return { error: 'Cannot delete product that is assigned to compartments' };
    }

    if (existing.bookings.length > 0) {
      return { error: 'Cannot delete product with existing bookings' };
    }

    await prisma.product.delete({
      where: { id },
    });

    await logDelete('product', id, existing);
    revalidatePath('/admin/products');

    return { success: true };
  } catch (error) {
    console.error('Delete product error:', error);
    return { error: 'Failed to delete product' };
  }
}

export async function toggleProductActive(id: string) {
  try {
    await requirePermission('products:update');

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return { error: 'Product not found' };
    }

    const product = await prisma.product.update({
      where: { id },
      data: { active: !existing.active },
    });

    await logUpdate('product', product.id, existing, product);
    revalidatePath('/admin/products');

    return { success: true, product };
  } catch (error) {
    console.error('Toggle product active error:', error);
    return { error: 'Failed to toggle product status' };
  }
}
