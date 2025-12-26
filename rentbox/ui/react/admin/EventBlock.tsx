import * as React from "react";
import type { CalendarEvent, TimeZone } from "../types";
import { cn } from "../components/ui/cn";
import { Badge } from "../components/ui/badge";
import { formatISOToTime } from "../time";

function statusVariant(e: CalendarEvent): { className: string; badgeVariant: React.ComponentProps<typeof Badge>["variant"] } {
	if (e.scope === "maintenance" || e.scope === "block") {
		return { className: "bg-amber-100 text-amber-950 border-amber-200", badgeVariant: "warning" };
	}
	if (e.status === "overdue") return { className: "bg-red-600 text-white border-red-700", badgeVariant: "destructive" };
	if (e.status === "active") return { className: "bg-green-600 text-white border-green-700", badgeVariant: "success" };
	if (e.status === "paid") return { className: "bg-blue-600 text-white border-blue-700", badgeVariant: "default" };
	if (e.status === "pending") return { className: "bg-gray-200 text-gray-900 border-gray-300", badgeVariant: "muted" };
	return { className: "bg-gray-100 text-gray-900 border-gray-200", badgeVariant: "muted" };
}

export function EventBlock({
	event,
	style,
	tz,
	onClick,
	lane,
	lanes,
}: {
	event: CalendarEvent;
	style: React.CSSProperties;
	tz: TimeZone;
	onClick: () => void;
	lane: number;
	lanes: number;
}) {
	const v = statusVariant(event);
	const height = lanes > 1 ? 18 : 22;
	const top = lane * (height + 2);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"absolute z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-xs",
				"shadow-sm hover:shadow transition-shadow",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2",
				v.className,
			)}
			style={{ ...style, top, height }}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="truncate font-medium">
					{event.scope === "block" ? "🔒 " : event.scope === "maintenance" ? "🛠 " : ""}
					{event.title}
				</div>
				<Badge variant={v.badgeVariant} className={cn("shrink-0", lanes > 1 ? "px-1.5 py-0 text-[10px]" : "")}>
					{event.scope === "booking" ? event.status : event.scope}
				</Badge>
			</div>
			<div className={cn("mt-0.5 truncate opacity-90", lanes > 1 ? "hidden" : "")}>
				{formatISOToTime(event.start_at, tz)}–{formatISOToTime(event.end_at, tz)}
			</div>
		</button>
	);
}

