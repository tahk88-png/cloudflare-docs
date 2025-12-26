import type { CSSProperties, ReactNode } from "react";

import {
	getRentboxCalendarIcon,
	getRentboxCalendarLabelET,
	getRentboxCalendarStyle,
	type RentboxCalendarStatus,
} from "../../../util/rentbox/calendar-status";
import { StatusBadge } from "./StatusBadge";
import { StatusIcon } from "./StatusIcon";

type Props = {
	status: RentboxCalendarStatus;
	title: string;
	meta?: ReactNode;
	/** Optional explicit label shown as badge inside the block. */
	badgeText?: string;
	/** Optional tooltip text (plain). */
	tooltip?: string;
	/** For overlap/conflict: show indicator icon. */
	showConflict?: boolean;
	className?: string;
};

function asEventVars(status: RentboxCalendarStatus): CSSProperties {
	const style = getRentboxCalendarStyle(status);
	return {
		["--rb-event-bg" as never]: style.bg,
		["--rb-event-fg" as never]: style.fg,
		["--rb-event-border" as never]: style.border ?? "transparent",
		["--rb-event-border-style" as never]: style.borderStyle ?? "solid",
	};
}

export function EventBlock({
	status,
	title,
	meta,
	badgeText,
	tooltip,
	showConflict,
	className,
}: Props) {
	const icon = getRentboxCalendarIcon(status);
	const defaultBadge = getRentboxCalendarLabelET(status);

	return (
		<div
			className={["rb-event", className].filter(Boolean).join(" ")}
			style={asEventVars(status)}
			tabIndex={0}
			title={tooltip}
			role="group"
			aria-label={`${title} (${badgeText ?? defaultBadge})`}
		>
			{icon ? (
				<span className="rb-badge__icon" aria-hidden="true">
					<StatusIcon icon={icon} />
				</span>
			) : null}
			<div className="rb-event__content">
				<div className="rb-event__title">{title}</div>
				<div className="rb-event__meta">
					<StatusBadge
						status={status}
						title={tooltip}
						className="rb-event__badge"
					>
						{badgeText ?? defaultBadge}
					</StatusBadge>
					{meta ? <span style={{ marginLeft: 8 }}>{meta}</span> : null}
				</div>
			</div>
			{showConflict ? (
				<span className="rb-badge__icon" aria-hidden="true" style={{ marginLeft: "auto" }}>
					<StatusIcon icon="warning" />
					<span className="rb-sr-only">Konflikt</span>
				</span>
			) : null}
		</div>
	);
}

