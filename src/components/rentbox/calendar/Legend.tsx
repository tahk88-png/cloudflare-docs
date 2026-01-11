import {
	getRentboxCalendarLabelET,
	type RentboxCalendarStatus,
	RENTBOX_CALENDAR_LEGEND,
} from "../../../util/rentbox/calendar-status";
import { StatusBadge } from "./StatusBadge";

type Props = {
	/** Override default legend list (default is fixed list per spec). */
	items?: RentboxCalendarStatus[];
	/** Optional label (admin: visible; customer: can be used as tooltip trigger). */
	label?: string;
};

export function Legend({ items = RENTBOX_CALENDAR_LEGEND, label }: Props) {
	return (
		<div className="rb-legend" role="list" aria-label={label ?? "Legend"}>
			{label ? <span className="rb-legend__label">{label}</span> : null}
			{items.map((status) => (
				<span role="listitem" key={status}>
					<StatusBadge status={status}>{getRentboxCalendarLabelET(status)}</StatusBadge>
				</span>
			))}
		</div>
	);
}

