import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface SkeletonGridProps {
  count?: number;
  variant?: "products" | "categories";
}

export function SkeletonGrid({ count = 6, variant = "products" }: SkeletonGridProps) {
  if (variant === "categories") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <CategorySkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full" />
        
        {/* Price */}
        <Skeleton className="h-6 w-1/3" />
        
        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function CategorySkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center p-4 sm:p-6">
        {/* Icon */}
        <Skeleton className="h-10 w-10 rounded-full mb-2" />
        
        {/* Name */}
        <Skeleton className="h-5 w-3/4 mb-1" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full mb-2" />
        
        {/* Count */}
        <Skeleton className="h-3 w-1/2 mt-2" />
      </CardContent>
    </Card>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Skeleton className="h-4 w-64" />
      
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-16 w-16 rounded" />
            <Skeleton className="h-16 w-16 rounded" />
            <Skeleton className="h-16 w-16 rounded" />
          </div>
        </div>
        
        {/* Details */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-full" />
          </div>
          
          <Skeleton className="h-10 w-1/3" />
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
