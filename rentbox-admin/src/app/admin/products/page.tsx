import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/requireRole";
import { getProducts } from "@/lib/admin/products";
import { getCategories } from "@/lib/admin/categories";
import { ProductsClient } from "./products-client";
import { SkeletonTable } from "@/components/admin/SkeletonTable";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    categoryId?: string;
    active?: string;
    search?: string;
  }>;
}

async function ProductsData({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;

  const [productsData, categories] = await Promise.all([
    getProducts({
      page,
      pageSize: 20,
      filters: {
        categoryId: params.categoryId,
        active: params.active ? params.active === "true" : undefined,
        search: params.search,
      },
    }),
    getCategories(),
  ]);

  return (
    <ProductsClient
      products={productsData.items}
      totalPages={productsData.totalPages}
      currentPage={page}
      total={productsData.total}
      categories={categories}
    />
  );
}

export default async function ProductsPage(props: PageProps) {
  await requirePermission("VIEW_PRODUCTS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your rental products and pricing
        </p>
      </div>

      <Suspense fallback={<SkeletonTable columns={7} rows={10} />}>
        <ProductsData searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
