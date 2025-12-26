import type { ISODate, TimeZone } from "../types";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { addDaysISODate } from "../time";
import { DurationChips } from "./DurationChips";

export function CalendarToolbar({
	date,
	onDateChange,
	durationMinutes,
	onDurationChange,
	stepMinutes,
	onStepChange,
	tz,
}: {
	date: ISODate;
	onDateChange: (d: ISODate) => void;
	durationMinutes: number;
	onDurationChange: (m: number) => void;
	stepMinutes: number;
	onStepChange: (m: number) => void;
	tz: TimeZone;
}) {
	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon" aria-label="Previous day" onClick={() => onDateChange(addDaysISODate(date, -1))}>
						<span aria-hidden>‹</span>
					</Button>
					<Input
						type="date"
						value={date}
						onChange={(e) => onDateChange(e.target.value as ISODate)}
						className="w-[10.5rem]"
						aria-label="Select date"
					/>
					<Button variant="outline" size="icon" aria-label="Next day" onClick={() => onDateChange(addDaysISODate(date, 1))}>
						<span aria-hidden>›</span>
					</Button>
				</div>

				<div className="flex items-center justify-between gap-2 sm:justify-end">
					<Badge variant="outline">Ajakava: {tz}</Badge>
				</div>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<DurationChips valueMinutes={durationMinutes} onChange={onDurationChange} />
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-600">Samm</span>
					<Select
						value={String(stepMinutes)}
						onValueChange={(v) => onStepChange(Number(v))}
						options={[
							{ value: "30", label: "30 min" },
							{ value: "60", label: "60 min" },
						]}
					/>
				</div>
			</div>
		</div>
	);
}

