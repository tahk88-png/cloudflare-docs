import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CompartmentsPage() {
  const compartments = await prisma.compartment.findMany({
    include: { locker: true, product: true },
    orderBy: [{ locker: { name: 'asc' } }, { label: 'asc' }]
  });

  const columns = [
    { header: "Locker", cell: (row: any) => row.locker?.name },
    { header: "Label", accessorKey: "label" as const },
    { header: "Product", cell: (row: any) => row.product?.name || <span className="text-muted-foreground">Empty</span> },
    { header: "Active", cell: (row: any) => <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Maintenance"}</Badge> },
    { header: "Notes", accessorKey: "notes" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Compartments</h1>
        <Link href="/admin/compartments/new"><Button><Plus className="mr-2 h-4 w-4" /> Add Compartment</Button></Link>
      </div>
      <DataTable columns={columns} data={compartments} />
    </div>
  );
}
