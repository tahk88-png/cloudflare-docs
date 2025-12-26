import * as React from "react";
import type { CalendarEvent, TimeZone } from "../types";
import { Sheet } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { formatISOToFull } from "../time";
import { StatusBadge } from "../components/StatusBadge";
import { labelForScope, statusForEvent } from "../design/calendarStatus";

export function EventDrawer({
	open,
	onOpenChange,
	event,
	tz,
	onDeleteBlock,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	event: CalendarEvent | null;
	tz: TimeZone;
	onDeleteBlock?: (id: number | string) => Promise<void>;
}) {
	const [busy, setBusy] = React.useState(false);
	const [err, setErr] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (open) {
			setErr(null);
			setBusy(false);
		}
	}, [open]);

	if (!event) return <Sheet open={open} onOpenChange={onOpenChange} title="Sündmus" />;

	const isBlock = event.scope === "maintenance" || event.scope === "block";
	const status = statusForEvent(event);

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title={event.title}
			description={`${formatISOToFull(event.start_at, tz)} → ${formatISOToFull(event.end_at, tz)}`}
			footer={
				isBlock && onDeleteBlock ? (
					<div className="flex items-center justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Sulge
						</Button>
						<Button
							variant="destructive"
							disabled={busy}
							onClick={async () => {
								setBusy(true);
								setErr(null);
								try {
									await onDeleteBlock(event.id);
									onOpenChange(false);
								} catch (e: any) {
									setErr(e?.message ?? "Ei õnnestunud kustutada.");
								} finally {
									setBusy(false);
								}
							}}
						>
							Kustuta blokk
						</Button>
					</div>
				) : (
					<div className="flex items-center justify-end">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Sulge
						</Button>
					</div>
				)
			}
		>
			{err ? (
				<Alert variant="destructive">
					<AlertTitle>Viga</AlertTitle>
					<AlertDescription>{err}</AlertDescription>
				</Alert>
			) : null}

			<div className="space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<StatusBadge status={status} withIcon={true} />
					<span className="rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-900">
						{labelForScope(event.scope)}
					</span>
					{event.locker_id ? (
						<span className="rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-900">locker: {event.locker_id}</span>
					) : null}
					{event.compartment_id ? (
						<span className="rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-900">
							compartment: {event.compartment_id}
						</span>
					) : null}
				</div>

				{event.scope === "booking" ? (
					<Alert>
						<AlertTitle>Broneering</AlertTitle>
						<AlertDescription>
							Siin saad näidata operatiivseid tegevusi (tagastus, tühistamine) vastavalt poliitikale.
						</AlertDescription>
					</Alert>
				) : (
					<Alert>
						<AlertTitle>{event.scope === "maintenance" ? "Hooldus" : "Blokeering"}</AlertTitle>
						<AlertDescription>{String((event.meta as any)?.reason ?? "")}</AlertDescription>
					</Alert>
				)}

				<details className="rounded-lg border border-gray-200 p-3">
					<summary className="cursor-pointer text-sm font-medium text-gray-900">Meta</summary>
					<pre className="mt-2 overflow-auto rounded-md bg-gray-50 p-2 text-xs text-gray-800">
						{JSON.stringify(event.meta ?? {}, null, 2)}
					</pre>
				</details>
			</div>
		</Sheet>
	);
}

