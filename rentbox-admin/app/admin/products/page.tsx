import { Suspense } from 'react';
import { ProductsTable } from '@/components/admin/products/ProductsTable';
import { CreateProductDialog } from '@/components/admin/products/CreateProductDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage rental products and pricing
          </p>
        </div>
        <CreateProductDialog />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-96 w-full" />
      </CardContent>
    </Card>
  );
}
