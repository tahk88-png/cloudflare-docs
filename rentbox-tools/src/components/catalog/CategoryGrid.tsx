import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryWithProductCount } from "@/lib/catalog/types";

interface CategoryGridProps {
  categories: CategoryWithProductCount[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

interface CategoryCardProps {
  category: CategoryWithProductCount;
}

function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/tooriistad/${category.slug}`}>
      <Card className="group h-full cursor-pointer transition-all hover:shadow-md hover:border-accent/50">
        <CardContent className="flex flex-col items-center p-4 sm:p-6 text-center">
          {/* Icon */}
          <span className="mb-2 text-3xl sm:text-4xl" role="img" aria-hidden="true">
            {category.icon}
          </span>

          {/* Name */}
          <h3 className="mb-1 font-semibold text-foreground text-sm sm:text-base leading-tight">
            {category.name}
          </h3>

          {/* Description */}
          <p className="mb-2 text-xs sm:text-sm text-muted line-clamp-2">
            {category.description}
          </p>

          {/* Product count */}
          <span className="mt-auto text-xs text-accent font-medium">
            {category.productCount} tööriista
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
