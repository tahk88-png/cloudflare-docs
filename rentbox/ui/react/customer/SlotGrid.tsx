import type { Slot, TimeZone } from "../types";
import { Skeleton } from "../components/ui/skeleton";
import { SlotButton } from "./SlotButton";

export function SlotGrid({
	slots,
	isLoading,
	selectedStartAt,
	onSelect,
	tz,
}: {
	slots: Slot[] | null;
	isLoading: boolean;
	selectedStartAt?: string | null;
	onSelect: (slot: Slot) => void;
	tz: TimeZone;
}) {
	if (isLoading && !slots) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-14 w-full" />
				<Skeleton className="h-14 w-full" />
				<Skeleton className="h-14 w-full" />
				<Skeleton className="h-14 w-full" />
				<Skeleton className="h-14 w-full" />
			</div>
		);
	}

	if (!slots) return null;

	return (
		<div className="max-h-[55vh] space-y-2 overflow-auto pr-1">
			{slots.map((s) => (
				<SlotButton
					key={s.start_at}
					slot={s}
					selected={Boolean(selectedStartAt && s.start_at === selectedStartAt)}
					onSelect={onSelect}
					tz={tz}
				/>
			))}
		</div>
	);
}

