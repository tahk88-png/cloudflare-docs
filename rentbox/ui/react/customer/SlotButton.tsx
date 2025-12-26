import type { Slot, TimeZone } from "../types";
import { cn } from "../components/ui/cn";
import { Badge } from "../components/ui/badge";
import { formatISOToTime } from "../time";

export function SlotButton({
	slot,
	selected,
	onSelect,
	tz,
}: {
	slot: Slot;
	selected: boolean;
	onSelect: (slot: Slot) => void;
	tz: TimeZone;
}) {
	const disabled = !slot.is_available;

	return (
		<button
			type="button"
			onClick={() => onSelect(slot)}
			disabled={disabled}
			className={cn(
				"flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left",
				"transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2",
				disabled ? "border-gray-200 bg-gray-50 text-gray-400" : "border-gray-200 bg-white hover:bg-gray-50",
				selected ? "border-black ring-1 ring-black/10" : "",
			)}
		>
			<div className="min-w-0">
				<div className="text-sm font-medium text-gray-900">
					{formatISOToTime(slot.start_at, tz)} – {formatISOToTime(slot.end_at, tz)}
				</div>
				<div className="mt-0.5 text-xs text-gray-600">Eesti aeg</div>
			</div>
			<Badge
				variant={slot.is_available ? "success" : "muted"}
				className={cn(slot.is_available ? "" : "text-gray-500")}
			>
				{slot.is_available ? "Vaba" : "Pole vaba"}
			</Badge>
		</button>
	);
}

