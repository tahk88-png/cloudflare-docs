"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, Wrench } from "lucide-react";

import type { Compartment, Locker, Product } from "@prisma/client";

import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { CompartmentForm, type CompartmentFormValues } from "@/components/admin/forms/CompartmentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
	clearCompartmentMaintenanceAction,
	createCompartmentAction,
	setCompartmentMaintenanceAction,
	updateCompartmentAction,
} from "@/lib/admin/compartments.actions";

export function CompartmentsClient({
	companions,
	lockers,
	products,
}: {
	companions: (Compartment & { locker: Locker; product: Product | null })[];
	lockers: Locker[];
	products: Product[];
}) {
	const router = useRouter();
	const params = useSearchParams();
	const lockerId = params?.get("lockerId") ?? "all";

	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<(Compartment & { locker: Locker; product: Product | null }) | null>(null);

	const [maint, setMaint] = React.useState<(Compartment & { locker: Locker; product: Product | null }) | null>(null);
	const [maintNotes, setMaintNotes] = React.useState("");

	const columns: ColumnDef<(Compartment & { locker: Locker; product: Product | null })>[] = [
		{
			key: "locker",
			header: "Locker",
			cell: (c) => (
				<div className="flex flex-col">
					<span className="font-medium">{c.locker.name}</span>
					<span className="text-xs text-[var(--rb-muted)]">
						{c.locker.locationText ?? "—"}
					</span>
				</div>
			),
		},
		{ key: "label", header: "Label", className: "w-24", cell: (c) => <span className="font-mono">{c.label}</span> },
		{
			key: "product",
			header: "Product",
			cell: (c) => (
				<div className="flex flex-col">
					<span>{c.product?.name ?? "Unassigned"}</span>
					{c.product && !c.product.active ? (
						<span className="text-xs text-[var(--rb-error)]">Inactive product</span>
					) : null}
				</div>
			),
		},
		{
			key: "active",
			header: "Active",
			className: "w-24",
			cell: (c) => (
				<span className={c.active ? "text-[var(--rb-text)]" : "text-[var(--rb-error)]"}>
					{c.active ? "Yes" : "No"}
				</span>
			),
		},
		{
			key: "actions",
			header: "",
			className: "w-44",
			cell: (c) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="icon"
						title="Edit / assign"
						onClick={() => {
							setEditing(c);
							setOpen(true);
						}}
					>
						<Pencil className="h-4 w-4" />
					</Button>

					<Button
						variant={c.active ? "outline" : "secondary"}
						size="icon"
						title={c.active ? "Set maintenance" : "Clear maintenance"}
						onClick={async () => {
							if (c.active) {
								setMaint(c);
								setMaintNotes(c.notes ?? "");
								return;
							}
							try {
								await clearCompartmentMaintenanceAction({ id: c.id });
								toast.success("Maintenance cleared.");
								window.location.reload();
							} catch (e: any) {
								toast.error(e?.message ?? "Failed.");
							}
						}}
					>
						<Wrench className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						title="View bookings"
						onClick={() => {
							router.push(`/admin/bookings?compartmentId=${encodeURIComponent(c.id)}`);
						}}
					>
						<ExternalLink className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];

	const initial: CompartmentFormValues = editing
		? {
				id: editing.id,
				lockerId: editing.lockerId,
				label: editing.label,
				productId: editing.productId,
				active: editing.active,
				notes: editing.notes,
			}
		: {
				lockerId: lockers[0]?.id ?? "",
				label: "",
				productId: null,
				active: true,
				notes: null,
			};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="flex-row items-center justify-between space-y-0">
					<CardTitle>Compartments</CardTitle>
					<Dialog
						open={open}
						onOpenChange={(v) => {
							setOpen(v);
							if (!v) setEditing(null);
						}}
					>
						<DialogTrigger asChild>
							<Button className="gap-2">
								<Plus className="h-4 w-4" />
								Add compartment
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{editing ? "Edit compartment" : "New compartment"}</DialogTitle>
							</DialogHeader>
							<CompartmentForm
								initial={initial}
								lockers={lockers.map((l) => ({ id: l.id, name: l.name }))}
								products={products.map((p) => ({ id: p.id, name: p.name, active: p.active }))}
								submitLabel={editing ? "Save changes" : "Create"}
								onSubmit={async (values) => {
									if (editing) {
										await updateCompartmentAction({
											id: editing.id,
											lockerId: values.lockerId,
											label: values.label,
											productId: values.productId ?? null,
											active: values.active,
											notes: values.notes ?? null,
										});
									} else {
										await createCompartmentAction({
											lockerId: values.lockerId,
											label: values.label,
											productId: values.productId ?? null,
											active: values.active,
											notes: values.notes ?? null,
										});
									}
									setOpen(false);
									window.location.reload();
								}}
							/>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-2 sm:max-w-sm">
						<Label>Locker filter</Label>
						<Select
							value={lockerId}
							onValueChange={(v) => {
								const next = new URLSearchParams(params?.toString());
								if (v === "all") next.delete("lockerId");
								else next.set("lockerId", v);
								router.push(`/admin/compartments?${next.toString()}`);
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="All lockers" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All lockers</SelectItem>
								{lockers.map((l) => (
									<SelectItem key={l.id} value={l.id}>
										{l.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<DataTable
						columns={columns}
						rows={companions}
						empty={<div className="py-10 text-sm text-[var(--rb-muted)]">No compartments.</div>}
					/>
				</CardContent>
			</Card>

			<Dialog open={!!maint} onOpenChange={(v) => !v && setMaint(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark compartment maintenance</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label>Reason / notes</Label>
						<Textarea
							value={maintNotes}
							onChange={(e) => setMaintNotes(e.target.value)}
							placeholder="e.g. Door jammed, awaiting service."
						/>
						<p className="text-xs text-[var(--rb-muted)]">
							This will set compartment active=false.
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setMaint(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={async () => {
								if (!maint) return;
								try {
									await setCompartmentMaintenanceAction({
										id: maint.id,
										notes: maintNotes || "Maintenance",
									});
									toast.success("Marked maintenance.");
									setMaint(null);
									window.location.reload();
								} catch (e: any) {
									toast.error(e?.message ?? "Failed.");
								}
							}}
						>
							Mark maintenance
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

