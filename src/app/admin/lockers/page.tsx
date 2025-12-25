import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function LockersPage() {
  const lockers = await prisma.locker.findMany({
    include: { _count: { select: { compartments: true } } }
  });

  const columns = [
    { header: "Name", accessorKey: "name" as const },
    { header: "Location", accessorKey: "location_text" as const },
    { header: "Timezone", accessorKey: "timezone" as const },
    { header: "Compartments", cell: (row: any) => row._count.compartments },
    { header: "Active", cell: (row: any) => <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Lockers</h1>
        <Link href="/admin/lockers/new"><Button><Plus className="mr-2 h-4 w-4" /> Add Locker</Button></Link>
      </div>
      <DataTable columns={columns} data={lockers} />
    </div>
  );
}
