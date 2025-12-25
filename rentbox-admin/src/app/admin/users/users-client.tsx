"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { formatLocalDateTime } from "@/lib/timezone";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  toggleUserActiveAction,
} from "@/app/actions/admin";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Copy,
  Plus,
  Pencil,
  Trash2,
  Users,
  Shield,
  Loader2,
} from "lucide-react";
import type { User, UserRole } from "@/lib/types";

const roleLabels: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  operator: "Operator",
  viewer: "Viewer",
};

const roleVariants: Record<UserRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  operator: "secondary",
  viewer: "outline",
};

interface UsersClientProps {
  users: Omit<User, "passwordHash">[];
}

export function UsersClient({ users }: UsersClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<Omit<
    User,
    "passwordHash"
  > | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    email: "",
    name: "",
    password: "",
    role: "viewer" as UserRole,
    active: true,
  });

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "viewer",
      active: true,
    });
    setSelectedUser(null);
  };

  const openEditDialog = (user: Omit<User, "passwordHash">) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role,
      active: user.active,
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
      email: formData.email,
      name: formData.name,
      role: formData.role,
      active: formData.active,
      ...(formData.password && { password: formData.password }),
    };

    const result = selectedUser
      ? await updateUserAction({ ...data, id: selectedUser.id })
      : await createUserAction({ ...data, password: formData.password });

    setIsPending(false);

    if (result.success) {
      toast.success(selectedUser ? "User updated" : "User created");
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save user");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsPending(true);
    const result = await deleteUserAction(selectedUser.id);
    setIsPending(false);

    if (result.success) {
      toast.success("User deleted");
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete user");
    }
  };

  const handleToggleActive = async (user: Omit<User, "passwordHash">) => {
    const result = await toggleUserActiveAction(user.id);
    if (result.success) {
      toast.success(
        result.data?.active ? "User activated" : "User deactivated"
      );
      router.refresh();
    } else {
      toast.error(result.error || "Failed to toggle user");
    }
  };

  if (users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No users yet"
        description="Create user accounts to manage admin access."
        actionLabel="Add User"
        onAction={openCreateDialog}
      />
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariants[user.role]}>
                    <Shield className="mr-1 h-3 w-3" />
                    {roleLabels[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? "success" : "secondary"}>
                    {user.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {user.lastLoginAt
                    ? formatLocalDateTime(user.lastLoginAt)
                    : "Never"}
                </TableCell>
                <TableCell className="text-sm">
                  {formatLocalDateTime(user.createdAt, "dd.MM.yyyy")}
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
                        onClick={() => handleCopyId(user.id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openEditDialog(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Edit User" : "Create User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? "Update the user details below."
                : "Fill in the details for the new user."}
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
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {selectedUser ? "New Password (leave empty to keep)" : "Password *"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required={!selectedUser}
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner (Full access)</SelectItem>
                  <SelectItem value="admin">Admin (Most features)</SelectItem>
                  <SelectItem value="operator">
                    Operator (Bookings & maintenance)
                  </SelectItem>
                  <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only owners can change user roles.
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
                ) : selectedUser ? (
                  "Update User"
                ) : (
                  "Create User"
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
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedUser?.name}&quot;? This
              action cannot be undone.
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
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
