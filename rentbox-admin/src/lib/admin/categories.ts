import prisma from "@/lib/db/prisma";
import type { Category } from "@/lib/types";
import { createAuditLog, createAuditDiff } from "./audit";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/validations";

/**
 * Get all categories ordered by order field
 */
export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    orderBy: { order: "asc" },
  });
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  return prisma.category.findUnique({
    where: { id },
  });
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return prisma.category.findUnique({
    where: { slug },
  });
}

/**
 * Create a new category
 */
export async function createCategory(
  data: CreateCategoryInput,
  actorUserId: string
): Promise<Category> {
  // Check for slug uniqueness
  const existingSlug = await prisma.category.findUnique({
    where: { slug: data.slug },
  });

  if (existingSlug) {
    throw new Error("A category with this slug already exists");
  }

  // Get max order if not provided
  let order = data.order;
  if (order === 0) {
    const maxOrder = await prisma.category.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (maxOrder?.order ?? 0) + 1;
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      order,
      active: data.active,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "create",
    entityType: "category",
    entityId: category.id,
    after: category as unknown as Record<string, unknown>,
  });

  return category;
}

/**
 * Update a category
 */
export async function updateCategory(
  data: UpdateCategoryInput,
  actorUserId: string
): Promise<Category> {
  const existing = await prisma.category.findUnique({
    where: { id: data.id },
  });

  if (!existing) {
    throw new Error("Category not found");
  }

  // Check slug uniqueness if changed
  if (data.slug && data.slug !== existing.slug) {
    const existingSlug = await prisma.category.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new Error("A category with this slug already exists");
    }
  }

  const category = await prisma.category.update({
    where: { id: data.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "category",
    entityId: category.id,
    ...createAuditDiff(
      existing as unknown as Record<string, unknown>,
      category as unknown as Record<string, unknown>
    ),
  });

  return category;
}

/**
 * Delete a category
 */
export async function deleteCategory(
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { products: { select: { id: true } } },
  });

  if (!existing) {
    throw new Error("Category not found");
  }

  // Check if category has products
  if (existing.products && existing.products.length > 0) {
    throw new Error("Cannot delete category with existing products");
  }

  await prisma.category.delete({
    where: { id },
  });

  await createAuditLog({
    actorUserId,
    action: "delete",
    entityType: "category",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
  });
}

/**
 * Reorder categories
 */
export async function reorderCategories(
  orderedIds: string[],
  actorUserId: string
): Promise<void> {
  // Update each category's order
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.category.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "category",
    entityId: "bulk_reorder",
    after: { orderedIds } as unknown as Record<string, unknown>,
  });
}

/**
 * Move category up in order
 */
export async function moveCategoryUp(
  id: string,
  actorUserId: string
): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Find category with lower order
  const previousCategory = await prisma.category.findFirst({
    where: { order: { lt: category.order } },
    orderBy: { order: "desc" },
  });

  if (!previousCategory) {
    return; // Already at top
  }

  // Swap orders
  await prisma.$transaction([
    prisma.category.update({
      where: { id: category.id },
      data: { order: previousCategory.order },
    }),
    prisma.category.update({
      where: { id: previousCategory.id },
      data: { order: category.order },
    }),
  ]);

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "category",
    entityId: id,
    before: { order: category.order },
    after: { order: previousCategory.order },
  });
}

/**
 * Move category down in order
 */
export async function moveCategoryDown(
  id: string,
  actorUserId: string
): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Find category with higher order
  const nextCategory = await prisma.category.findFirst({
    where: { order: { gt: category.order } },
    orderBy: { order: "asc" },
  });

  if (!nextCategory) {
    return; // Already at bottom
  }

  // Swap orders
  await prisma.$transaction([
    prisma.category.update({
      where: { id: category.id },
      data: { order: nextCategory.order },
    }),
    prisma.category.update({
      where: { id: nextCategory.id },
      data: { order: category.order },
    }),
  ]);

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "category",
    entityId: id,
    before: { order: category.order },
    after: { order: nextCategory.order },
  });
}
