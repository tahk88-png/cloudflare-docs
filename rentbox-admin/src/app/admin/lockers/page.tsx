import { requirePermission } from "@/lib/auth/requireRole";
import { getLockers } from "@/lib/admin/lockers";
import { LockersClient } from "./lockers-client";

export default async function LockersPage() {
  await requirePermission("VIEW_PRODUCTS");
  const lockers = await getLockers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lockers</h1>
        <p className="text-muted-foreground">
          Manage locker locations and their compartments
        </p>
      </div>

      <LockersClient lockers={lockers} />
    </div>
  );
}
