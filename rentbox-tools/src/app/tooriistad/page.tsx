import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryGrid } from "@/components/catalog/CategoryGrid";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SearchBar } from "@/components/catalog/SearchBar";
import { SkeletonGrid } from "@/components/catalog/SkeletonGrid";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getCategoriesWithProductCount, getFeaturedProducts } from "@/lib/catalog/data";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Tööriistad",
  description: "Rendi tööriistu 24/7. Võta kapist, kasuta, tagasta. Laiad kategooriad professionaalsetele ja kodukasutajatele.",
  openGraph: {
    title: "Tööriistad | Rentbox.ee",
    description: "Rendi tööriistu 24/7. Võta kapist, kasuta, tagasta.",
  },
};

export default async function ToolsPage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-accent/5 to-background py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Tööriistad 24/7.{" "}
              <span className="text-accent">Rendi ainult siis, kui vaja.</span>
            </h1>
            <p className="mb-8 text-lg text-muted sm:text-xl">
              Võta kapist, kasuta, tagasta. Ilma ootamata, ilma kohustuseta.
            </p>
            <SearchBar placeholder="Otsi tööriistu (nt. muruniiduk, trell, survepesur...)" />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Kategooriad</h2>
          </div>
          <Suspense fallback={<SkeletonGrid count={9} variant="categories" />}>
            <CategoriesSection />
          </Suspense>
        </div>
      </section>

      <div className="container mx-auto px-4">
        <Separator />
      </div>

      {/* Featured Products Section */}
      <section className="py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Populaarsed tööriistad</h2>
            <Button asChild variant="ghost" className="text-accent">
              <Link href="/tooriistad?sort=popular">
                Vaata kõiki
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Suspense fallback={<SkeletonGrid count={6} variant="products" />}>
            <FeaturedProductsSection />
          </Suspense>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-card border-y border-border py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <TrustItem
              icon="🔐"
              title="24/7 ligipääs"
              description="Võta tööriist kapist ükskõik mis kellaajal"
            />
            <TrustItem
              icon="💳"
              title="Paindlik hinnastus"
              description="Maksa ainult kasutatud aja eest"
            />
            <TrustItem
              icon="✅"
              title="Hooldatud tööriistad"
              description="Kõik tööriistad on kontrollitud ja töökorras"
            />
          </div>
        </div>
      </section>

      {/* Category Links Section (for SEO) */}
      <section className="py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-6 text-xl font-semibold text-foreground">
            Sirvi kategooriate kaupa
          </h2>
          <Suspense fallback={null}>
            <CategoryLinksSection />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function CategoriesSection() {
  const categories = await getCategoriesWithProductCount();
  return <CategoryGrid categories={categories} />;
}

async function FeaturedProductsSection() {
  const products = await getFeaturedProducts(6);
  return <ProductGrid products={products} />;
}

async function CategoryLinksSection() {
  const categories = await getCategoriesWithProductCount();
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/tooriistad/${category.slug}`}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-accent/50 hover:bg-background"
        >
          {category.icon} {category.name}
        </Link>
      ))}
    </div>
  );
}

function TrustItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <span className="mb-2 text-3xl" role="img" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}
