"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type CompartmentFormValues = {
	id?: string;
	lockerId: string;
	label: string;
	productId?: string | null;
	active: boolean;
	notes?: string | null;
};

export function CompartmentForm({
	initial,
	lockers,
	products,
	submitLabel = "Save",
	onSubmit,
}: {
	initial: CompartmentFormValues;
	lockers: { id: string; name: string }[];
	products: { id: string; name: string; active: boolean }[];
	submitLabel?: string;
	onSubmit: (values: CompartmentFormValues) => Promise<void>;
}) {
	const [values, setValues] = React.useState<CompartmentFormValues>(initial);
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
				<Label>Locker</Label>
				<Select
					value={values.lockerId}
					onValueChange={(lockerId) => setValues((v) => ({ ...v, lockerId }))}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select locker" />
					</SelectTrigger>
					<SelectContent>
						{lockers.map((l) => (
							<SelectItem key={l.id} value={l.id}>
								{l.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="label">Label</Label>
				<Input
					id="label"
					value={values.label}
					onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
					placeholder="e.g. A1"
					required
				/>
				<p className="text-xs text-[var(--rb-muted)]">Unique per locker.</p>
			</div>

			<div className="grid gap-2">
				<Label>Product (optional)</Label>
				<Select
					value={values.productId ?? "unassigned"}
					onValueChange={(v) =>
						setValues((x) => ({
							...x,
							productId: v === "unassigned" ? null : v,
						}))
					}
				>
					<SelectTrigger>
						<SelectValue placeholder="Unassigned" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="unassigned">Unassigned</SelectItem>
						{products.map((p) => (
							<SelectItem key={p.id} value={p.id}>
								{p.name}
								{p.active ? "" : " (inactive)"}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="notes">Notes</Label>
				<Textarea
					id="notes"
					value={values.notes ?? ""}
					onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value || null }))}
					placeholder="Maintenance notes"
				/>
			</div>

			<div className="flex items-center justify-between rounded-xl border border-[var(--rb-border)] bg-white p-3">
				<div>
					<div className="text-sm font-medium">Active</div>
					<div className="text-xs text-[var(--rb-muted)]">
						Disable to mark maintenance.
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

