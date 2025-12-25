import { getProducts } from "@/lib/admin/products";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";

export default async function ProductsPage() {
  const products = await getProducts();

  const columns = [
    {
      header: "Name",
      accessorKey: "name" as const,
      className: "font-medium",
    },
    {
      header: "Category",
      cell: (row: any) => row.category?.name || "-",
    },
    {
      header: "Price",
      cell: (row: any) => `${row.base_price} / ${row.price_unit}`,
    },
    {
      header: "Compartments",
      cell: (row: any) => row._count.compartments,
    },
    {
        header: "Active",
        cell: (row: any) => (
            <Badge variant={row.active ? "default" : "secondary"}>
                {row.active ? "Active" : "Inactive"}
            </Badge>
        )
    },
    {
        header: "Actions",
        cell: (row: any) => (
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/products/${row.id}`}>
                        <Edit className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
        </Link>
      </div>
      
      <DataTable columns={columns} data={products} />
    </div>
  );
}
