import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getProducts(params: { active?: boolean } = {}) {
  const where: Prisma.ProductWhereInput = {};
  if (params.active !== undefined) where.active = params.active;

  return prisma.product.findMany({
    where,
    include: {
      category: true,
      _count: {
        select: { compartments: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
