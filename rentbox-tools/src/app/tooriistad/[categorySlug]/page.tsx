import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { FiltersPanel } from "@/components/catalog/FiltersPanel";
import { SortBar } from "@/components/catalog/SortBar";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { EmptyState } from "@/components/catalog/EmptyState";
import { SkeletonGrid } from "@/components/catalog/SkeletonGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCategoryBySlug, getProducts, getLockers } from "@/lib/catalog/data";
import { parseFilters } from "@/lib/catalog/query";
import { AlertCircle } from "lucide-react";

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);

  if (!category) {
    return {
      title: "Kategooria ei leitud",
    };
  }

  return {
    title: `${category.name} - Tööriistad`,
    description: `Rendi ${category.name.toLowerCase()} tööriistu 24/7. ${category.description}`,
    openGraph: {
      title: `${category.name} | Rentbox.ee`,
      description: `Rendi ${category.name.toLowerCase()} tööriistu 24/7. ${category.description}`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { categorySlug } = await params;
  const resolvedSearchParams = await searchParams;
  const category = await getCategoryBySlug(categorySlug);

  if (!category) {
    notFound();
  }

  const filters = parseFilters(resolvedSearchParams);
  const lockers = await getLockers();
  const showLocationFilter = lockers.length > 1;

  return (
    <main className="flex-1 py-6 sm:py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Tööriistad", href: "/tooriistad" },
            { label: category.name },
          ]}
        />

        {/* Category Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl" role="img" aria-hidden="true">
              {category.icon}
            </span>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {category.name}
            </h1>
          </div>
          <p className="text-muted">{category.description}</p>
        </header>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Sidebar Filters (desktop) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-6 rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 font-semibold text-foreground">Filtrid</h2>
              <FiltersPanel
                filters={filters}
                showLocationFilter={showLocationFilter}
              />
            </div>
          </aside>

          {/* Products Area */}
          <div className="flex-1 min-w-0">
            <Suspense fallback={<ProductsLoading />}>
              <ProductsSection
                categorySlug={categorySlug}
                categoryName={category.name}
                filters={filters}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

async function ProductsSection({
  categorySlug,
  categoryName,
  filters,
}: {
  categorySlug: string;
  categoryName: string;
  filters: ReturnType<typeof parseFilters>;
}) {
  try {
    const result = await getProducts(categorySlug, filters);
    const basePath = `/tooriistad/${categorySlug}`;

    return (
      <>
        {/* Sort Bar */}
        <div className="mb-6">
          <SortBar
            filters={filters}
            totalResults={result.total}
            showMobileFilters={true}
          />
        </div>

        {/* Products Grid or Empty State */}
        {result.items.length > 0 ? (
          <>
            <ProductGrid products={result.items} categoryName={categoryName} />

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={result.page}
                  totalPages={result.totalPages}
                  basePath={basePath}
                  filters={filters}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </>
    );
  } catch (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Toodete laadimisel tekkis viga. Palun proovi hiljem uuesti.
        </AlertDescription>
      </Alert>
    );
  }
}

function ProductsLoading() {
  return (
    <>
      {/* Sort bar skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-10 w-64 animate-pulse rounded-md bg-disabled/30" />
        <div className="h-10 w-40 animate-pulse rounded-md bg-disabled/30" />
      </div>
      <SkeletonGrid count={6} variant="products" />
    </>
  );
}
