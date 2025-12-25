import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/requireRole";
import { getAuditLogs, type AuditAction, type AuditEntityType } from "@/lib/admin/audit";
import { AuditClient } from "./audit-client";
import { SkeletonTable } from "@/components/admin/SkeletonTable";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    actorUserId?: string;
    entityType?: AuditEntityType;
    action?: AuditAction;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

async function AuditData({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;

  const auditData = await getAuditLogs({
    page,
    pageSize: 50,
    actorUserId: params.actorUserId,
    entityType: params.entityType,
    action: params.action,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
  });

  return (
    <AuditClient
      logs={auditData.items}
      totalPages={auditData.totalPages}
      currentPage={page}
      total={auditData.total}
    />
  );
}

export default async function AuditPage(props: PageProps) {
  await requirePermission("VIEW_AUDIT_LOG");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Immutable record of all system changes
        </p>
      </div>

      <Suspense fallback={<SkeletonTable columns={6} rows={15} />}>
        <AuditData searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
