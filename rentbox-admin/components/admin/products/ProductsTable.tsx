import { prisma } from '@/lib/db/prisma';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductActions } from './ProductActions';
import { formatDate } from '@/lib/timezone';

async function getProducts() {
  return prisma.product.findMany({
    include: {
      category: {
        select: { name: true },
      },
      _count: {
        select: { compartments: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function ProductsTable() {
  const products = await getProducts();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compartments</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.shortDescription && (
                          <div className="text-sm text-muted-foreground">
                            {product.shortDescription}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell>
                      {product.basePrice.toString()} €/{product.priceUnit}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.active ? 'default' : 'outline'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{product._count.compartments}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(product.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductActions product={product} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
