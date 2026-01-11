import * as React from "react";
import type { CalendarEvent, TimeZone } from "../types";
import { cn } from "../components/ui/cn";
import { StatusBadge } from "../components/StatusBadge";
import { formatISOToTime } from "../time";
import { CALENDAR_STATUS, statusForEvent } from "../design/calendarStatus";

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
	const status = statusForEvent(event);
	const spec = CALENDAR_STATUS[status];
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
				"text-white",
			)}
			style={{
				...style,
				top,
				height,
				backgroundColor: spec.color.hex,
				borderColor: "rgba(0,0,0,0.18)",
			}}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="truncate font-medium">
					{status === "blocked" || status === "maintenance" || status === "overdue" ? (
						<span aria-hidden className="mr-1">{spec.icon}</span>
					) : null}
					{event.title}
				</div>
				<StatusBadge
					status={status}
					withIcon={false}
					kind="event"
					className={cn("shrink-0", lanes > 1 ? "px-1.5 py-0 text-[10px]" : "")}
				/>
			</div>
			<div className={cn("mt-0.5 truncate opacity-90", lanes > 1 ? "hidden" : "")}>
				{formatISOToTime(event.start_at, tz)}–{formatISOToTime(event.end_at, tz)}
			</div>
		</button>
	);
}

