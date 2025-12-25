"use client";

import * as React from "react";
import { toast } from "sonner";
import { BookingStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type BookingFormValues = {
	id?: string;
	lockerId: string;
	compartmentId: string;
	startsLocal: string; // YYYY-MM-DDTHH:mm
	endsLocal: string;
	status: BookingStatus;
	cancelReason?: string;
};

export function BookingForm({
	initial,
	lockers,
	compartments,
	submitLabel = "Save",
	onSubmit,
}: {
	initial: BookingFormValues;
	lockers: { id: string; name: string }[];
	compartments: { id: string; lockerId: string; label: string; productName: string | null }[];
	submitLabel?: string;
	onSubmit: (values: BookingFormValues) => Promise<void>;
}) {
	const [values, setValues] = React.useState<BookingFormValues>(initial);
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => setValues(initial), [initial]);

	const filteredCompartments = compartments.filter((c) => c.lockerId === values.lockerId);

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
					<Label>Locker</Label>
					<Select
						value={values.lockerId}
						onValueChange={(lockerId) =>
							setValues((v) => ({
								...v,
								lockerId,
								compartmentId:
									compartments.find((c) => c.lockerId === lockerId)?.id ?? "",
							}))
						}
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
					<Label>Compartment</Label>
					<Select
						value={values.compartmentId}
						onValueChange={(compartmentId) => setValues((v) => ({ ...v, compartmentId }))}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select compartment" />
						</SelectTrigger>
						<SelectContent>
							{filteredCompartments.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.label} {c.productName ? `— ${c.productName}` : "(unassigned)"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label>Starts (Tallinn)</Label>
					<Input
						type="datetime-local"
						value={values.startsLocal}
						onChange={(e) => setValues((v) => ({ ...v, startsLocal: e.target.value }))}
						required
					/>
				</div>
				<div className="grid gap-2">
					<Label>Ends (Tallinn)</Label>
					<Input
						type="datetime-local"
						value={values.endsLocal}
						onChange={(e) => setValues((v) => ({ ...v, endsLocal: e.target.value }))}
						required
					/>
				</div>
			</div>

			<div className="grid gap-2">
				<Label>Status</Label>
				<Select
					value={values.status}
					onValueChange={(status) => setValues((v) => ({ ...v, status: status as BookingStatus }))}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={BookingStatus.pending}>pending</SelectItem>
						<SelectItem value={BookingStatus.confirmed}>confirmed</SelectItem>
						<SelectItem value={BookingStatus.cancelled}>cancelled</SelectItem>
						<SelectItem value={BookingStatus.completed}>completed</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex justify-end">
				<Button type="submit" disabled={busy}>
					{busy ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}

