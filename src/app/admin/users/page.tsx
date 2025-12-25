import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminUsersPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Users &amp; Roles</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Manage admin users and RBAC roles (owner-only role changes).
				</p>
			</div>

			<EmptyState
				title="No users UI yet"
				description="This page will include role assignment safeguards and activation controls."
			/>
		</div>
	);
}

