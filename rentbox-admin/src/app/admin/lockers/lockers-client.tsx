"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { copyToClipboard } from "@/lib/utils";
import {
  createLockerAction,
  updateLockerAction,
  deleteLockerAction,
} from "@/app/actions/admin";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Copy,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Box,
  Loader2,
} from "lucide-react";
import type { LockerWithRelations } from "@/lib/types";

interface LockersClientProps {
  lockers: LockerWithRelations[];
}

export function LockersClient({ lockers }: LockersClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedLocker, setSelectedLocker] =
    React.useState<LockerWithRelations | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    locationText: "",
    timezone: "Europe/Tallinn",
    active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      locationText: "",
      timezone: "Europe/Tallinn",
      active: true,
    });
    setSelectedLocker(null);
  };

  const openEditDialog = (locker: LockerWithRelations) => {
    setSelectedLocker(locker);
    setFormData({
      name: locker.name,
      locationText: locker.locationText,
      timezone: locker.timezone,
      active: locker.active,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCopyId = async (id: string) => {
    await copyToClipboard(id);
    toast.success("ID copied to clipboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    const data = {
      name: formData.name,
      locationText: formData.locationText,
      timezone: formData.timezone,
      active: formData.active,
    };

    const result = selectedLocker
      ? await updateLockerAction({ ...data, id: selectedLocker.id })
      : await createLockerAction(data);

    setIsPending(false);

    if (result.success) {
      toast.success(selectedLocker ? "Locker updated" : "Locker created");
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save locker");
    }
  };

  const handleDelete = async () => {
    if (!selectedLocker) return;

    setIsPending(true);
    const result = await deleteLockerAction(selectedLocker.id);
    setIsPending(false);

    if (result.success) {
      toast.success("Locker deleted");
      setDeleteDialogOpen(false);
      setSelectedLocker(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete locker");
    }
  };

  if (lockers.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No lockers yet"
        description="Create your first locker location to start managing compartments."
        actionLabel="Add Locker"
        onAction={openCreateDialog}
      />
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Locker
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Compartments</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lockers.map((locker) => {
              const activeCompartments = locker.compartments.filter(
                (c) => c.active
              ).length;
              const totalCompartments = locker.compartments.length;

              return (
                <TableRow key={locker.id}>
                  <TableCell>
                    <div className="font-medium">{locker.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {locker.locationText}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/compartments?lockerId=${locker.id}`}
                      className="flex items-center gap-1 hover:underline"
                    >
                      <Box className="h-4 w-4" />
                      <span>
                        {activeCompartments}/{totalCompartments}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{locker.timezone}</TableCell>
                  <TableCell>
                    <Badge variant={locker.active ? "success" : "secondary"}>
                      {locker.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleCopyId(locker.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/compartments?lockerId=${locker.id}`}
                          >
                            <Box className="mr-2 h-4 w-4" />
                            View Compartments
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(locker)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLocker(locker);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLocker ? "Edit Locker" : "Create Locker"}
            </DialogTitle>
            <DialogDescription>
              {selectedLocker
                ? "Update the locker details below."
                : "Fill in the details for the new locker location."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Downtown Locker #1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationText">Location *</Label>
              <Input
                id="locationText"
                value={formData.locationText}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    locationText: e.target.value,
                  }))
                }
                placeholder="e.g., 123 Main Street, Tallinn"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, timezone: e.target.value }))
                }
                disabled
              />
              <p className="text-xs text-muted-foreground">
                All lockers operate in Europe/Tallinn timezone
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked }))
                }
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedLocker ? (
                  "Update Locker"
                ) : (
                  "Create Locker"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Locker</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedLocker?.name}&quot;? This
              action cannot be undone. Lockers with compartments cannot be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Locker"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
