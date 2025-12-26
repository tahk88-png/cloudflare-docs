import { cn } from "../components/ui/cn";
import { Button } from "../components/ui/button";

export interface DurationOption {
	label: string;
	minutes: number;
}

export const DEFAULT_DURATIONS: DurationOption[] = [
	{ label: "1h", minutes: 60 },
	{ label: "2h", minutes: 120 },
	{ label: "4h", minutes: 240 },
	{ label: "8h", minutes: 480 },
	{ label: "24h", minutes: 1440 },
];

export function DurationChips({
	valueMinutes,
	onChange,
	options = DEFAULT_DURATIONS,
}: {
	valueMinutes: number;
	onChange: (minutes: number) => void;
	options?: DurationOption[];
}) {
	return (
		<div className="flex flex-wrap gap-2" aria-label="Duration">
			{options.map((o) => {
				const active = o.minutes === valueMinutes;
				return (
					<Button
						key={o.minutes}
						variant={active ? "default" : "outline"}
						size="sm"
						onClick={() => onChange(o.minutes)}
						className={cn(active ? "" : "bg-white")}
					>
						{o.label}
					</Button>
				);
			})}
		</div>
	);
}

