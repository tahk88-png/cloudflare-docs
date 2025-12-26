import type { CalendarStatusKey } from "../design/calendarStatus";
import { StatusBadge } from "./StatusBadge";
import { cn } from "./ui/cn";

const LEGEND: CalendarStatusKey[] = ["available", "paid", "active", "overdue", "maintenance", "blocked"];

export function CalendarLegend({
	className,
	variant = "admin",
}: {
	className?: string;
	variant?: "admin" | "customer";
}) {
	return (
		<div className={cn("space-y-2", className)}>
			<div className="text-xs font-medium text-gray-700">{variant === "admin" ? "Legend" : "Selgitused"}</div>
			<div className="flex flex-wrap gap-2">
				{LEGEND.map((k) => (
					<StatusBadge key={k} status={k} withIcon={k === "overdue" || k === "maintenance" || k === "blocked"} />
				))}
			</div>
		</div>
	);
}

