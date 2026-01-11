import type { CSSProperties, ReactNode } from "react";

import {
	getRentboxCalendarIcon,
	getRentboxCalendarLabelET,
	getRentboxCalendarStyle,
	type RentboxCalendarStatus,
} from "../../../util/rentbox/calendar-status";
import { StatusIcon } from "./StatusIcon";

type Props = {
	status: RentboxCalendarStatus;
	children?: ReactNode;
	title?: string;
	className?: string;
};

function asBadgeVars(status: RentboxCalendarStatus): CSSProperties {
	const style = getRentboxCalendarStyle(status);
	return {
		["--rb-badge-bg" as never]: style.bg,
		["--rb-badge-fg" as never]: style.fg,
		["--rb-badge-border" as never]: style.border ?? "transparent",
		["--rb-badge-border-style" as never]: style.borderStyle ?? "solid",
	};
}

/**
 * Rentbox calendar badge:
 * - Sentence case (no uppercase transforms)
 * - Max 12 chars (hard guard)
 * - Color is never the only indicator (text + optional icon + title/tooltip)
 */
export function StatusBadge({ status, children, title, className }: Props) {
	const label = String(children ?? getRentboxCalendarLabelET(status));

	if (label.length > 12) {
		throw new Error(
			`[StatusBadge] Badge text must be <= 12 chars, got "${label}" (${label.length}).`,
		);
	}

	const icon = getRentboxCalendarIcon(status);

	return (
		<span
			className={["rb-badge", className].filter(Boolean).join(" ")}
			style={asBadgeVars(status)}
			title={title}
		>
			{icon ? (
				<span className="rb-badge__icon" aria-hidden="true">
					<StatusIcon icon={icon} />
				</span>
			) : null}
			<span>{label}</span>
		</span>
	);
}

