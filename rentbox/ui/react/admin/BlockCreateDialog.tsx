import * as React from "react";
import type { TimeZone } from "../types";
import { Dialog } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { formatISOToFull } from "../time";

export function BlockCreateDialog({
	open,
	onOpenChange,
	startAt,
	endAt,
	target,
	tz,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	startAt: string | null;
	endAt: string | null;
	target: { lockerId: number; compartmentId: number | null };
	tz: TimeZone;
	onConfirm: (args: { reason: string }) => Promise<void>;
}) {
	const [reason, setReason] = React.useState("");
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => {
		if (open) {
			setReason("");
			setBusy(false);
		}
	}, [open]);

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			title="Loo hooldusblokk"
			description={
				startAt && endAt
					? `${formatISOToFull(startAt, tz)} → ${formatISOToFull(endAt, tz)}`
					: "Vali ajavahemik ajajoonel."
			}
			footer={
				<>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Loobu
					</Button>
					<Button
						disabled={busy || !reason.trim() || !startAt || !endAt}
						onClick={async () => {
							setBusy(true);
							try {
								await onConfirm({ reason: reason.trim() });
								onOpenChange(false);
							} finally {
								setBusy(false);
							}
						}}
					>
						Kinnita
					</Button>
				</>
			}
		>
			<div className="space-y-2">
				<div className="text-sm text-gray-700">
					Siht: locker <strong>{target.lockerId}</strong>
					{target.compartmentId ? (
						<>
							{" "}
							/ compartment <strong>{target.compartmentId}</strong>
						</>
					) : null}
				</div>
				<div className="space-y-1">
					<div className="text-xs font-medium text-gray-700">Põhjus</div>
					<Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nt. hooldus / remont / koristus…" />
				</div>
				<div className="text-xs text-gray-600">Blokk mõjutab saadavust. Broneeringud võivad siiski olla nähtavad hoiatusega.</div>
			</div>
		</Dialog>
	);
}

