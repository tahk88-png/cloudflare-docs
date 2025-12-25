import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } }
  });

  const columns = [
    { header: "Order", accessorKey: "order" as const },
    { header: "Name", accessorKey: "name" as const },
    { header: "Slug", accessorKey: "slug" as const },
    { header: "Products", cell: (row: any) => row._count.products },
    { header: "Active", cell: (row: any) => <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <Link href="/admin/categories/new"><Button><Plus className="mr-2 h-4 w-4" /> Add Category</Button></Link>
      </div>
      <DataTable columns={columns} data={categories} />
    </div>
  );
}
