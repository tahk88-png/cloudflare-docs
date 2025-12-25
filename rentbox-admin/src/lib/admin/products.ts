import prisma from "@/lib/db/prisma";
import type {
  ProductWithRelations,
  ProductFilters,
  PaginatedResponse,
} from "@/lib/types";
import { createAuditLog, createAuditDiff } from "./audit";
import type { CreateProductInput, UpdateProductInput } from "@/lib/validations";

/**
 * Get products with pagination and filters
 */
export async function getProducts(params: {
  page?: number;
  pageSize?: number;
  filters?: ProductFilters;
}): Promise<PaginatedResponse<ProductWithRelations>> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const skip = (page - 1) * pageSize;
  const filters = params.filters || {};

  const where = {
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.active !== undefined && { active: filters.active }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" as const } },
        { slug: { contains: filters.search, mode: "insensitive" as const } },
        {
          shortDescription: {
            contains: filters.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        tags: { include: { tag: true } },
        images: { orderBy: { order: "asc" } },
        compartments: true,
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items as ProductWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single product by ID
 */
export async function getProductById(
  id: string
): Promise<ProductWithRelations | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      tags: { include: { tag: true } },
      images: { orderBy: { order: "asc" } },
      compartments: true,
    },
  });

  return product as ProductWithRelations | null;
}

/**
 * Get a single product by slug
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductWithRelations | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      tags: { include: { tag: true } },
      images: { orderBy: { order: "asc" } },
      compartments: true,
    },
  });

  return product as ProductWithRelations | null;
}

/**
 * Create a new product
 */
export async function createProduct(
  data: CreateProductInput,
  actorUserId: string
): Promise<ProductWithRelations> {
  // Check for slug uniqueness
  const existingSlug = await prisma.product.findUnique({
    where: { slug: data.slug },
  });

  if (existingSlug) {
    throw new Error("A product with this slug already exists");
  }

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      shortDescription: data.shortDescription,
      description: data.description,
      categoryId: data.categoryId,
      basePrice: data.basePrice,
      priceUnit: data.priceUnit,
      slotMinutes: data.slotMinutes,
      minRentalMinutes: data.minRentalMinutes,
      maxRentalMinutes: data.maxRentalMinutes,
      active: data.active,
      tags: data.tagIds
        ? {
            create: data.tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
      images: data.images
        ? {
            create: data.images.map((img) => ({
              url: img.url,
              alt: img.alt,
              order: img.order,
              isPrimary: img.isPrimary,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      tags: { include: { tag: true } },
      images: { orderBy: { order: "asc" } },
      compartments: true,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "create",
    entityType: "product",
    entityId: product.id,
    after: product as unknown as Record<string, unknown>,
  });

  return product as ProductWithRelations;
}

/**
 * Update a product
 */
export async function updateProduct(
  data: UpdateProductInput,
  actorUserId: string
): Promise<ProductWithRelations> {
  const existing = await prisma.product.findUnique({
    where: { id: data.id },
    include: {
      tags: true,
      images: true,
    },
  });

  if (!existing) {
    throw new Error("Product not found");
  }

  // Check slug uniqueness if changed
  if (data.slug && data.slug !== existing.slug) {
    const existingSlug = await prisma.product.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new Error("A product with this slug already exists");
    }
  }

  // Update product
  const product = await prisma.product.update({
    where: { id: data.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.shortDescription !== undefined && {
        shortDescription: data.shortDescription,
      }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
      ...(data.priceUnit && { priceUnit: data.priceUnit }),
      ...(data.slotMinutes !== undefined && { slotMinutes: data.slotMinutes }),
      ...(data.minRentalMinutes !== undefined && {
        minRentalMinutes: data.minRentalMinutes,
      }),
      ...(data.maxRentalMinutes !== undefined && {
        maxRentalMinutes: data.maxRentalMinutes,
      }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: {
      category: true,
      tags: { include: { tag: true } },
      images: { orderBy: { order: "asc" } },
      compartments: true,
    },
  });

  // Update tags if provided
  if (data.tagIds !== undefined) {
    // Remove existing tags
    await prisma.productTag.deleteMany({
      where: { productId: data.id },
    });
    // Add new tags
    if (data.tagIds.length > 0) {
      await prisma.productTag.createMany({
        data: data.tagIds.map((tagId) => ({
          productId: data.id,
          tagId,
        })),
      });
    }
  }

  // Update images if provided
  if (data.images !== undefined) {
    // Remove existing images
    await prisma.productImage.deleteMany({
      where: { productId: data.id },
    });
    // Add new images
    if (data.images.length > 0) {
      await prisma.productImage.createMany({
        data: data.images.map((img) => ({
          productId: data.id,
          url: img.url,
          alt: img.alt,
          order: img.order,
          isPrimary: img.isPrimary,
        })),
      });
    }
  }

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "product",
    entityId: product.id,
    ...createAuditDiff(
      existing as unknown as Record<string, unknown>,
      product as unknown as Record<string, unknown>
    ),
  });

  return product as ProductWithRelations;
}

/**
 * Delete a product
 */
export async function deleteProduct(
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { compartments: true, bookings: true },
  });

  if (!existing) {
    throw new Error("Product not found");
  }

  // Check if product has active bookings
  const activeBookings = existing.bookings?.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );
  if (activeBookings && activeBookings.length > 0) {
    throw new Error("Cannot delete product with active bookings");
  }

  // Check if product is assigned to compartments
  if (existing.compartments && existing.compartments.length > 0) {
    throw new Error("Cannot delete product assigned to compartments");
  }

  await prisma.product.delete({
    where: { id },
  });

  await createAuditLog({
    actorUserId,
    action: "delete",
    entityType: "product",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
  });
}

/**
 * Get active products count
 */
export async function getActiveProductsCount(): Promise<number> {
  return prisma.product.count({
    where: { active: true },
  });
}

/**
 * Quick update product price
 */
export async function updateProductPrice(
  id: string,
  basePrice: number,
  actorUserId: string
): Promise<ProductWithRelations> {
  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Product not found");
  }

  const product = await prisma.product.update({
    where: { id },
    data: { basePrice },
    include: {
      category: true,
      tags: { include: { tag: true } },
      images: { orderBy: { order: "asc" } },
      compartments: true,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "product",
    entityId: product.id,
    before: { basePrice: existing.basePrice },
    after: { basePrice: product.basePrice },
  });

  return product as ProductWithRelations;
}

/**
 * Toggle product active status
 */
export async function toggleProductActive(
  id: string,
  actorUserId: string
): Promise<ProductWithRelations> {
  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Product not found");
  }

  const product = await prisma.product.update({
    where: { id },
    data: { active: !existing.active },
    include: {
      category: true,
      tags: { include: { tag: true } },
      images: { orderBy: { order: "asc" } },
      compartments: true,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "product",
    entityId: product.id,
    before: { active: existing.active },
    after: { active: product.active },
  });

  return product as ProductWithRelations;
}
