"use client";

import * as React from "react";
import { toast } from "sonner";

import { RENTBOX_TZ } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SettingsFormValues = {
	defaultSlotMinutes: number;
	defaultMinRentalMinutes: number;
	timezone: typeof RENTBOX_TZ;
	contactEmail?: string | null;
	contactPhone?: string | null;
};

export function SettingsForm({
	initial,
	onSubmit,
}: {
	initial: SettingsFormValues;
	onSubmit: (values: SettingsFormValues) => Promise<void>;
}) {
	const [values, setValues] = React.useState<SettingsFormValues>(initial);
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
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label>Default slot minutes</Label>
					<Input
						type="number"
						value={values.defaultSlotMinutes}
						onChange={(e) =>
							setValues((v) => ({
								...v,
								defaultSlotMinutes: Number(e.target.value) || 15,
							}))
						}
						min={5}
					/>
				</div>
				<div className="grid gap-2">
					<Label>Default min rental (minutes)</Label>
					<Input
						type="number"
						value={values.defaultMinRentalMinutes}
						onChange={(e) =>
							setValues((v) => ({
								...v,
								defaultMinRentalMinutes: Number(e.target.value) || 60,
							}))
						}
						min={5}
					/>
				</div>
			</div>

			<div className="grid gap-2">
				<Label>Timezone</Label>
				<Select value={values.timezone} onValueChange={(tz) => setValues((v) => ({ ...v, timezone: tz as any }))}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={RENTBOX_TZ}>{RENTBOX_TZ}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label>Contact email (optional)</Label>
					<Input
						type="email"
						value={values.contactEmail ?? ""}
						onChange={(e) =>
							setValues((v) => ({ ...v, contactEmail: e.target.value || null }))
						}
					/>
				</div>
				<div className="grid gap-2">
					<Label>Contact phone (optional)</Label>
					<Input
						value={values.contactPhone ?? ""}
						onChange={(e) =>
							setValues((v) => ({ ...v, contactPhone: e.target.value || null }))
						}
					/>
				</div>
			</div>

			<div className="flex justify-end">
				<Button type="submit" disabled={busy}>
					{busy ? "Saving…" : "Save settings"}
				</Button>
			</div>
		</form>
	);
}

