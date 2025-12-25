import { requirePermission } from "@/lib/auth/requireRole";
import { getCategories } from "@/lib/admin/categories";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  await requirePermission("VIEW_PRODUCTS");
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage product categories and their ordering
        </p>
      </div>

      <CategoriesClient categories={categories} />
    </div>
  );
}
