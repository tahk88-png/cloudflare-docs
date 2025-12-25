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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createCompartmentAction,
  updateCompartmentAction,
  deleteCompartmentAction,
  setMaintenanceAction,
  assignProductAction,
} from "@/app/actions/admin";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Copy,
  Plus,
  Pencil,
  Trash2,
  Box,
  Wrench,
  Package,
  Loader2,
} from "lucide-react";
import type {
  CompartmentWithRelations,
  LockerWithRelations,
  ProductWithRelations,
} from "@/lib/types";

interface CompartmentsClientProps {
  compartments: CompartmentWithRelations[];
  lockers: LockerWithRelations[];
  products: ProductWithRelations[];
}

export function CompartmentsClient({
  compartments,
  lockers,
  products,
}: CompartmentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] =
    React.useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedCompartment, setSelectedCompartment] =
    React.useState<CompartmentWithRelations | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    lockerId: lockers[0]?.id || "",
    label: "",
    productId: "",
    active: true,
    notes: "",
  });

  const [maintenanceNotes, setMaintenanceNotes] = React.useState("");
  const [assignProductId, setAssignProductId] = React.useState("");

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/compartments?${params.toString()}`);
  };

  const resetForm = () => {
    setFormData({
      lockerId: searchParams.get("lockerId") || lockers[0]?.id || "",
      label: "",
      productId: "",
      active: true,
      notes: "",
    });
    setSelectedCompartment(null);
  };

  const openEditDialog = (compartment: CompartmentWithRelations) => {
    setSelectedCompartment(compartment);
    setFormData({
      lockerId: compartment.lockerId,
      label: compartment.label,
      productId: compartment.productId || "",
      active: compartment.active,
      notes: compartment.notes || "",
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openMaintenanceDialog = (compartment: CompartmentWithRelations) => {
    setSelectedCompartment(compartment);
    setMaintenanceNotes(compartment.notes || "");
    setMaintenanceDialogOpen(true);
  };

  const openAssignDialog = (compartment: CompartmentWithRelations) => {
    setSelectedCompartment(compartment);
    setAssignProductId(compartment.productId || "");
    setAssignDialogOpen(true);
  };

  const handleCopyId = async (id: string) => {
    await copyToClipboard(id);
    toast.success("ID copied to clipboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    const data = {
      lockerId: formData.lockerId,
      label: formData.label,
      productId: formData.productId || null,
      active: formData.active,
      notes: formData.notes || undefined,
    };

    const result = selectedCompartment
      ? await updateCompartmentAction({ ...data, id: selectedCompartment.id })
      : await createCompartmentAction(data);

    setIsPending(false);

    if (result.success) {
      toast.success(
        selectedCompartment ? "Compartment updated" : "Compartment created"
      );
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save compartment");
    }
  };

  const handleDelete = async () => {
    if (!selectedCompartment) return;

    setIsPending(true);
    const result = await deleteCompartmentAction(selectedCompartment.id);
    setIsPending(false);

    if (result.success) {
      toast.success("Compartment deleted");
      setDeleteDialogOpen(false);
      setSelectedCompartment(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete compartment");
    }
  };

  const handleMaintenance = async (setActive: boolean) => {
    if (!selectedCompartment) return;

    setIsPending(true);
    const result = await setMaintenanceAction(
      selectedCompartment.id,
      setActive,
      maintenanceNotes
    );
    setIsPending(false);

    if (result.success) {
      toast.success(
        setActive ? "Compartment activated" : "Compartment set to maintenance"
      );
      setMaintenanceDialogOpen(false);
      setSelectedCompartment(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update maintenance status");
    }
  };

  const handleAssign = async () => {
    if (!selectedCompartment) return;

    setIsPending(true);
    const result = await assignProductAction(
      selectedCompartment.id,
      assignProductId || null
    );
    setIsPending(false);

    if (result.success) {
      toast.success(
        assignProductId ? "Product assigned" : "Product unassigned"
      );
      setAssignDialogOpen(false);
      setSelectedCompartment(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to assign product");
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={searchParams.get("lockerId") || "all"}
          onValueChange={(value) => updateFilter("lockerId", value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by locker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lockers</SelectItem>
            {lockers.map((locker) => (
              <SelectItem key={locker.id} value={locker.id}>
                {locker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("active") || "all"}
          onValueChange={(value) => updateFilter("active", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={openCreateDialog} className="ml-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Compartment
        </Button>
      </div>

      {/* Table */}
      {compartments.length === 0 && !searchParams.toString() ? (
        <EmptyState
          icon={Box}
          title="No compartments yet"
          description="Create compartments to store rental products."
          actionLabel="Add Compartment"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Locker</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No compartments found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                compartments.map((compartment) => (
                  <TableRow key={compartment.id}>
                    <TableCell>
                      <div className="font-medium">
                        {compartment.locker.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{compartment.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {compartment.product ? (
                        <div className="text-sm">{compartment.product.name}</div>
                      ) : (
                        <span className="text-muted-foreground">
                          No product assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={compartment.active ? "success" : "warning"}
                      >
                        {compartment.active ? "Active" : "Maintenance"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {compartment.notes || "-"}
                      </div>
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
                            onClick={() => handleCopyId(compartment.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openAssignDialog(compartment)}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Assign Product
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openMaintenanceDialog(compartment)}
                          >
                            <Wrench className="mr-2 h-4 w-4" />
                            {compartment.active
                              ? "Set Maintenance"
                              : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(compartment)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCompartment(compartment);
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCompartment ? "Edit Compartment" : "Create Compartment"}
            </DialogTitle>
            <DialogDescription>
              {selectedCompartment
                ? "Update the compartment details below."
                : "Fill in the details for the new compartment."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lockerId">Locker *</Label>
              <Select
                value={formData.lockerId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, lockerId: value }))
                }
                disabled={!!selectedCompartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select locker" />
                </SelectTrigger>
                <SelectContent>
                  {lockers.map((locker) => (
                    <SelectItem key={locker.id} value={locker.id}>
                      {locker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="e.g., A1, B2"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productId">Product</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, productId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No product</SelectItem>
                  {products
                    .filter((p) => p.active)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional notes (e.g., maintenance history)"
                rows={3}
              />
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
                ) : selectedCompartment ? (
                  "Update Compartment"
                ) : (
                  "Create Compartment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCompartment?.active
                ? "Set Maintenance Mode"
                : "Activate Compartment"}
            </DialogTitle>
            <DialogDescription>
              {selectedCompartment?.active
                ? "This will mark the compartment as unavailable for bookings."
                : "This will make the compartment available for bookings again."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maintenanceNotes">Notes</Label>
              <Textarea
                id="maintenanceNotes"
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
                placeholder="Enter maintenance notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMaintenanceDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                handleMaintenance(!selectedCompartment?.active)
              }
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : selectedCompartment?.active ? (
                "Set Maintenance"
              ) : (
                "Activate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Product Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Product</DialogTitle>
            <DialogDescription>
              Select a product to assign to this compartment, or leave empty to
              unassign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignProduct">Product</Label>
              <Select
                value={assignProductId}
                onValueChange={setAssignProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No product (unassign)</SelectItem>
                  {products
                    .filter((p) => p.active)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Compartment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this compartment? This action
              cannot be undone. Compartments with active bookings cannot be
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
                "Delete Compartment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
