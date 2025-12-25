import { prisma } from '@/lib/db/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/timezone';

async function getAuditLogs() {
  return prisma.auditLog.findMany({
    take: 100,
    include: {
      actorUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
  STATUS_CHANGE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export default async function AuditLogPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all changes and administrative actions
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No audit logs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{log.actorUser.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.actorUser.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}
                          variant="outline"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.entityType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.entityId.substring(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
