import type { ISODate, TimeZone } from "../types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { addDaysISODate } from "../time";

export type AdminView = "day" | "week";

export function AdminCalendarToolbar({
	date,
	onDateChange,
	view,
	onViewChange,
	startHour,
	endHour,
	onTimeWindowChange,
	tz,
}: {
	date: ISODate;
	onDateChange: (d: ISODate) => void;
	view: AdminView;
	onViewChange: (v: AdminView) => void;
	startHour: number;
	endHour: number;
	onTimeWindowChange: (w: { startHour: number; endHour: number }) => void;
	tz: TimeZone;
}) {
	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon" aria-label="Previous" onClick={() => onDateChange(addDaysISODate(date, view === "week" ? -7 : -1))}>
						<span aria-hidden>‹</span>
					</Button>
					<Input type="date" value={date} onChange={(e) => onDateChange(e.target.value as ISODate)} className="w-[10.5rem]" />
					<Button variant="outline" size="icon" aria-label="Next" onClick={() => onDateChange(addDaysISODate(date, view === "week" ? 7 : 1))}>
						<span aria-hidden>›</span>
					</Button>
					<Button variant="ghost" size="sm" onClick={() => onDateChange(addDaysISODate(date, 0))}>
						Täna
					</Button>
				</div>

				<div className="flex items-center justify-between gap-2 sm:justify-end">
					<Tabs
						value={view}
						onValueChange={onViewChange}
						options={[
							{ value: "day", label: "Päev" },
							{ value: "week", label: "Nädal" },
						]}
					/>
					<Badge variant="outline">{tz}</Badge>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-600">Ajavahemik</span>
					<Input
						type="number"
						min={0}
						max={23}
						value={startHour}
						onChange={(e) => onTimeWindowChange({ startHour: Number(e.target.value), endHour })}
						className="w-20"
						aria-label="Start hour"
					/>
					<span className="text-sm text-gray-600">–</span>
					<Input
						type="number"
						min={1}
						max={24}
						value={endHour}
						onChange={(e) => onTimeWindowChange({ startHour, endHour: Number(e.target.value) })}
						className="w-20"
						aria-label="End hour"
					/>
				</div>
				<div className="text-right text-xs text-gray-600 sm:text-left">Sündmused joondame 15-min sammule.</div>
			</div>
		</div>
	);
}

