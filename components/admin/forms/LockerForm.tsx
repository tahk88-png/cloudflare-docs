"use client";

import * as React from "react";
import { toast } from "sonner";

import { RENTBOX_TZ } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type LockerFormValues = {
	id?: string;
	name: string;
	locationText?: string | null;
	timezone: typeof RENTBOX_TZ;
	active: boolean;
};

export function LockerForm({
	initial,
	submitLabel = "Save",
	onSubmit,
}: {
	initial: LockerFormValues;
	submitLabel?: string;
	onSubmit: (values: LockerFormValues) => Promise<void>;
}) {
	const [values, setValues] = React.useState<LockerFormValues>(initial);
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => setValues(initial), [initial]);

	return (
		<form
			className="space-y-4"
			onSubmit={async (e) => {
				e.preventDefault();
				setBusy(true);
				try {
					await onSubmit(values);
					toast.success("Saved.");
				} catch (err: any) {
					toast.error(err?.message ?? "Failed to save.");
					throw err;
				} finally {
					setBusy(false);
				}
			}}
		>
			<div className="grid gap-2">
				<Label htmlFor="name">Name</Label>
				<Input
					id="name"
					value={values.name}
					onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
					placeholder="e.g. Tallinn — Ülemiste"
					required
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="locationText">Location</Label>
				<Input
					id="locationText"
					value={values.locationText ?? ""}
					onChange={(e) =>
						setValues((v) => ({ ...v, locationText: e.target.value || null }))
					}
					placeholder="Address or instructions"
				/>
			</div>

			<div className="grid gap-2">
				<Label>Timezone</Label>
				<Select
					value={values.timezone}
					onValueChange={(tz) => setValues((v) => ({ ...v, timezone: tz as any }))}
				>
					<SelectTrigger>
						<SelectValue placeholder="Timezone" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={RENTBOX_TZ}>{RENTBOX_TZ}</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-xs text-[var(--rb-muted)]">Locked for Rentbox Estonia.</p>
			</div>

			<div className="flex items-center justify-between rounded-xl border border-[var(--rb-border)] bg-white p-3">
				<div>
					<div className="text-sm font-medium">Active</div>
					<div className="text-xs text-[var(--rb-muted)]">
						Inactive lockers are excluded from operations.
					</div>
				</div>
				<Switch
					checked={values.active}
					onCheckedChange={(active) => setValues((v) => ({ ...v, active }))}
				/>
			</div>

			<div className="flex justify-end">
				<Button type="submit" disabled={busy}>
					{busy ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}

