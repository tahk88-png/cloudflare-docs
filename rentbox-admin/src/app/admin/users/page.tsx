import { requirePermission } from "@/lib/auth/requireRole";
import { getUsers } from "@/lib/admin/users";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  await requirePermission("VIEW_USERS");
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users & Roles</h1>
        <p className="text-muted-foreground">
          Manage admin users and their access levels
        </p>
      </div>

      <UsersClient users={users} />
    </div>
  );
}
