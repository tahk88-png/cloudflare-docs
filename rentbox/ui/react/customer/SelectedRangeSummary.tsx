import type { Slot, TimeZone } from "../types";
import { Card, CardContent } from "../components/ui/card";
import { formatISOToFull } from "../time";

export function SelectedRangeSummary({ selected, tz }: { selected: Slot | null; tz: TimeZone }) {
	if (!selected) {
		return (
			<Card>
				<CardContent className="text-sm text-gray-700">
					Vali sobiv aeg. Kuvame ajad Eesti ajas.
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="text-sm">
				<div className="font-medium text-gray-900">Valitud aeg</div>
				<div className="mt-1 text-gray-700">
					{formatISOToFull(selected.start_at, tz)} → {formatISOToFull(selected.end_at, tz)}
				</div>
			</CardContent>
		</Card>
	);
}

