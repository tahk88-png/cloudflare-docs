import type { ISODateTime, TimeZone } from "../types";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { formatISOToFull } from "../time";

export function NextAvailableBanner({
	nextAvailableAt,
	onJump,
	tz,
}: {
	nextAvailableAt: ISODateTime | null;
	onJump: () => void;
	tz: TimeZone;
}) {
	if (!nextAvailableAt) {
		return (
			<Alert>
				<AlertTitle>Täna vabu aegu pole.</AlertTitle>
				<AlertDescription>Proovi teist kuupäeva või muuda kestust.</AlertDescription>
			</Alert>
		);
	}

	return (
		<Alert>
			<div className="flex items-start justify-between gap-3">
				<div>
					<AlertTitle>Täna vabu aegu pole.</AlertTitle>
					<AlertDescription>Järgmine vaba: {formatISOToFull(nextAvailableAt, tz)}</AlertDescription>
				</div>
				<Button variant="outline" size="sm" onClick={onJump}>
					Leia järgmine vaba
				</Button>
			</div>
		</Alert>
	);
}

