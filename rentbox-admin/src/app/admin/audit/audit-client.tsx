"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatLocalDateTime } from "@/lib/timezone";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
} from "lucide-react";
import type { AuditLogWithRelations } from "@/lib/types";

const actionLabels: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  status_change: "Status Changed",
  login: "Logged In",
  logout: "Logged Out",
};

const actionVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  status_change: "outline",
  login: "outline",
  logout: "outline",
};

const entityLabels: Record<string, string> = {
  booking: "Booking",
  product: "Product",
  category: "Category",
  locker: "Locker",
  compartment: "Compartment",
  user: "User",
  setting: "Setting",
  tag: "Tag",
};

interface AuditClientProps {
  logs: AuditLogWithRelations[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export function AuditClient({
  logs,
  totalPages,
  currentPage,
  total,
}: AuditClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedLog, setSelectedLog] =
    React.useState<AuditLogWithRelations | null>(null);

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/admin/audit?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handleCopyId = async (id: string) => {
    await copyToClipboard(id);
    toast.success("ID copied to clipboard");
  };

  const viewDetails = (log: AuditLogWithRelations) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  if (logs.length === 0 && !searchParams.toString()) {
    return (
      <EmptyState
        icon={FileText}
        title="No audit logs yet"
        description="Activity will be logged here as changes are made to the system."
      />
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={searchParams.get("entityType") || "all"}
          onValueChange={(value) => updateFilter("entityType", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="locker">Locker</SelectItem>
            <SelectItem value="compartment">Compartment</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="setting">Setting</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("action") || "all"}
          onValueChange={(value) => updateFilter("action", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="status_change">Status Change</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get("dateFrom") || ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
          placeholder="From date"
        />

        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get("dateTo") || ""}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          placeholder="To date"
        />

        {searchParams.toString() && (
          <Button variant="ghost" onClick={() => router.push("/admin/audit")}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No audit logs found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatLocalDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    {log.actor ? (
                      <div>
                        <div className="font-medium">{log.actor.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.actor.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionVariants[log.action] || "outline"}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entityLabels[log.entityType] || log.entityType}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {log.entityId.substring(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyId(log.entityId)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <p className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * 50 + 1} to{" "}
          {Math.min(currentPage * 50, total)} of {total} entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog &&
                `${actionLabels[selectedLog.action]} ${
                  entityLabels[selectedLog.entityType]
                } at ${formatLocalDateTime(selectedLog.createdAt)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Actor:</span>
                  <p className="font-medium">
                    {selectedLog.actor?.name || "System"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address:</span>
                  <p className="font-medium">
                    {selectedLog.ipAddress || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity ID:</span>
                  <p className="font-mono text-xs">{selectedLog.entityId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Log ID:</span>
                  <p className="font-mono text-xs">{selectedLog.id}</p>
                </div>
              </div>

              {selectedLog.beforeJson && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Before:</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.beforeJson, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterJson && (
                <div>
                  <h4 className="text-sm font-medium mb-2">After:</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.afterJson, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <span className="text-muted-foreground text-sm">
                    User Agent:
                  </span>
                  <p className="text-xs text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
