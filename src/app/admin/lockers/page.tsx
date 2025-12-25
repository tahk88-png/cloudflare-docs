import { listLockers } from "@/lib/admin/lockers";
import { LockersClient } from "@/components/admin/lockers/LockersClient";

export default async function AdminLockersPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Lockers</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Manage locker locations, timezone, and active status.
				</p>
			</div>

			<LockersClient lockers={await listLockers()} />
		</div>
	);
}

