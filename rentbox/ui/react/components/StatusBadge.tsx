import * as React from "react";
import { Badge } from "./ui/badge";
import { cn } from "./ui/cn";
import type { CalendarStatusKey } from "../design/calendarStatus";
import { CALENDAR_STATUS } from "../design/calendarStatus";

export interface StatusBadgeProps extends Omit<React.ComponentProps<typeof Badge>, "variant" | "children"> {
	status: CalendarStatusKey;
	withIcon?: boolean;
	kind?: "badge" | "event"; // badges may choose text color; event blocks always white
}

export function StatusBadge({ status, withIcon = false, kind = "badge", className, ...props }: StatusBadgeProps) {
	const spec = CALENDAR_STATUS[status];
	const textColor = kind === "event" ? "#FFFFFF" : spec.color.textOnBadge;

	return (
		<Badge
			{...props}
			variant="default"
			className={cn(
				"max-w-[12ch] truncate",
				kind === "event" ? "rounded-md px-2 py-0.5 text-[11px]" : "",
				className,
			)}
			style={{
				backgroundColor: spec.color.hex,
				color: textColor,
				...(props.style ?? {}),
			}}
			title={spec.label}
		>
			{withIcon && spec.icon ? <span aria-hidden className="mr-1">{spec.icon}</span> : null}
			{spec.label}
		</Badge>
	);
}

