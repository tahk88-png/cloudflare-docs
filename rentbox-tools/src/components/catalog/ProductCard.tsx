import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/catalog/types";
import { 
  getAvailabilityLabel, 
  getAvailabilityVariant,
  getCategoryBySlug 
} from "@/lib/catalog/data";
import { formatPrice, getPriceUnitLabel } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  categoryName?: string;
}

export function ProductCard({ product, categoryName }: ProductCardProps) {
  const productUrl = `/tooriistad/${product.categorySlug}/${product.slug}`;
  const bookingUrl = `/tooriistad/${product.categorySlug}/${product.slug}#broneeri`;
  
  const availabilityLabel = getAvailabilityLabel(product.availabilityStatus);
  const availabilityVariant = getAvailabilityVariant(product.availabilityStatus);
  const priceUnitLabel = getPriceUnitLabel(product.priceUnit);
  const isUnavailable = product.availabilityStatus === "unavailable";

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Clickable overlay for entire card */}
      <Link 
        href={productUrl} 
        className="absolute inset-0 z-10"
        aria-label={`Vaata ${product.name}`}
      >
        <span className="sr-only">Vaata detaile</span>
      </Link>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-background">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-muted">
            🔧
          </div>
        )}
        
        {/* Badges overlay */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs bg-card/90 backdrop-blur-sm">
            24/7
          </Badge>
          {categoryName && (
            <Badge variant="outline" className="text-xs bg-card/90 backdrop-blur-sm">
              {categoryName}
            </Badge>
          )}
        </div>

        {/* Availability badge */}
        <div className="absolute bottom-2 right-2">
          <Badge variant={availabilityVariant} className="text-xs">
            {availabilityLabel}
          </Badge>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="mb-1 font-semibold leading-tight text-foreground line-clamp-2">
          {product.name}
        </h3>

        {/* Short description */}
        <p className="mb-3 text-sm text-muted line-clamp-1">
          {product.shortDescription}
        </p>

        {/* Price */}
        <div className="mt-auto mb-3">
          <span className="text-lg font-bold text-foreground">
            al. {formatPrice(product.basePrice)}€
          </span>
          <span className="text-sm text-muted"> / {priceUnitLabel}</span>
        </div>

        {/* Actions - z-20 to be above card link overlay */}
        <div className="relative z-20 flex gap-2">
          <Button
            asChild
            size="sm"
            className="flex-1"
            disabled={isUnavailable}
          >
            <Link href={bookingUrl}>Broneeri</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={productUrl}>Vaata detaile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Async version that fetches category name
export async function ProductCardAsync({ product }: { product: Product }) {
  const category = await getCategoryBySlug(product.categorySlug);
  return <ProductCard product={product} categoryName={category?.name} />;
}
