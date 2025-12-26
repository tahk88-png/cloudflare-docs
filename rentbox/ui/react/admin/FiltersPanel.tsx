import type { AdminFilters, CalendarScope, ProductOption } from "../types";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

const BOOKING_STATUSES = ["pending", "paid", "active", "overdue", "completed", "cancelled", "expired"] as const;
const SCOPES: CalendarScope[] = ["booking", "maintenance", "block"];

export function FiltersPanel({
	filters,
	onChange,
	products,
}: {
	filters: AdminFilters;
	onChange: (f: AdminFilters) => void;
	products?: ProductOption[];
}) {
	function toggleStatus(s: string) {
		const next = new Set(filters.statuses);
		if (next.has(s)) next.delete(s);
		else next.add(s);
		onChange({ ...filters, statuses: next });
	}

	function toggleScope(s: CalendarScope) {
		const next = new Set(filters.scopes);
		if (next.has(s)) next.delete(s);
		else next.add(s);
		onChange({ ...filters, scopes: next });
	}

	return (
		<div className="space-y-3">
			<div className="space-y-1">
				<div className="text-xs font-medium text-gray-700">Otsi</div>
				<Input
					placeholder="Broneeringu ID / märksõna…"
					value={filters.search ?? ""}
					onChange={(e) => onChange({ ...filters, search: e.target.value })}
				/>
			</div>

			{products && products.length > 0 ? (
				<div className="space-y-1">
					<div className="text-xs font-medium text-gray-700">Toode</div>
					<Select
						value={String(filters.productId ?? "")}
						onValueChange={(v) => onChange({ ...filters, productId: v ? Number(v) : null })}
						options={[
							{ value: "", label: "Kõik" },
							...products.map((p) => ({ value: String(p.id), label: p.name })),
						]}
						className="w-full"
					/>
				</div>
			) : null}

			<div className="space-y-2">
				<div className="text-xs font-medium text-gray-700">Scope</div>
				<div className="grid grid-cols-1 gap-2">
					{SCOPES.map((s) => (
						<Checkbox
							key={s}
							checked={filters.scopes.has(s)}
							onChange={() => toggleScope(s)}
							label={s === "booking" ? "Broneeringud" : s === "maintenance" ? "Hooldus" : "Blokeeringud"}
						/>
					))}
				</div>
			</div>

			<div className="space-y-2">
				<div className="text-xs font-medium text-gray-700">Broneeringu staatus</div>
				<div className="grid grid-cols-2 gap-2">
					{BOOKING_STATUSES.map((s) => (
						<Checkbox key={s} checked={filters.statuses.has(s)} onChange={() => toggleStatus(s)} label={s} />
					))}
				</div>
			</div>
		</div>
	);
}

