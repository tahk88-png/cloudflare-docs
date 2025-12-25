import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const columns = [
    { header: "Name", accessorKey: "name" as const },
    { header: "Email", accessorKey: "email" as const },
    { header: "Role", cell: (row: any) => <Badge variant="outline">{row.role}</Badge> },
    { header: "Active", cell: (row: any) => <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge> },
    { header: "Joined", cell: (row: any) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Users & Roles</h1>
      </div>
      <DataTable columns={columns} data={users} />
    </div>
  );
}
