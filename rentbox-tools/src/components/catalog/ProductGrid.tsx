import { Product } from "@/lib/catalog/types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  categoryName?: string;
}

export function ProductGrid({ products, categoryName }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          categoryName={categoryName}
        />
      ))}
    </div>
  );
}
