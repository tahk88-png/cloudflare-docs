import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/admin/DataTable";
import { format } from "date-fns";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { created_at: 'desc' },
    include: { actor: true }
  });

  const columns = [
    { header: "Time", cell: (row: any) => format(row.created_at, "yyyy-MM-dd HH:mm:ss") },
    { header: "Actor", cell: (row: any) => row.actor?.name || row.actor?.email || row.actorUserId },
    { header: "Action", accessorKey: "action" as const },
    { header: "Entity", cell: (row: any) => `${row.entity_type} (${row.entity_id})` },
    { header: "Details", cell: (row: any) => <span className="text-xs font-mono truncate max-w-[200px] inline-block">{JSON.stringify(row.after_json)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
      </div>
      <DataTable columns={columns} data={logs} />
    </div>
  );
}
