'use server'

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/admin/audit";
import { getCurrentUser } from "@/lib/auth/requireRole";
import { PriceUnit } from "@prisma/client";

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  categoryId: z.string(),
  base_price: z.coerce.number().min(0),
  price_unit: z.nativeEnum(PriceUnit),
  active: z.boolean().optional(),
});

export async function createProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const rawData = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId"),
    base_price: formData.get("base_price"),
    price_unit: formData.get("price_unit"),
    active: formData.get("active") === "on",
  };

  const validated = productSchema.parse(rawData);

  const product = await prisma.product.create({
    data: {
      ...validated,
      tags: [], // Placeholder
      images: [], // Placeholder
    },
  });

  await createAuditLog(user.id, "CREATE", "Product", product.id, null, product);

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
