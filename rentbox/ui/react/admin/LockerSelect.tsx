import type { LockerOption } from "../types";
import { Select } from "../components/ui/select";

export function LockerSelect({
	lockers,
	value,
	onChange,
}: {
	lockers: LockerOption[];
	value: number;
	onChange: (id: number) => void;
}) {
	return (
		<div className="space-y-1">
			<div className="text-xs font-medium text-gray-700">Kapp</div>
			<Select
				value={String(value)}
				onValueChange={(v) => onChange(Number(v))}
				options={lockers.map((l) => ({ value: String(l.id), label: l.name }))}
				className="w-full"
			/>
		</div>
	);
}

