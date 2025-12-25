import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminAuditPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Audit Log</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Immutable record of admin changes: who did what, when.
				</p>
			</div>

			<EmptyState
				title="No audit UI yet"
				description="This page will include filters and basic JSON before/after diff."
			/>
		</div>
	);
}

