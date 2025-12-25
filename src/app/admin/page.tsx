import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminDashboardPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Dashboard</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Operational overview for lockers, compartments, bookings, and issues.
				</p>
			</div>

			<EmptyState
				title="Dashboard wiring in progress"
				description="Next step: KPI cards, alerts (conflicts, maintenance), and quick actions."
			/>
		</div>
	);
}

