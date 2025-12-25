"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { Locker } from "@prisma/client";

import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/dialogs/ConfirmDialog";
import { LockerForm, type LockerFormValues } from "@/components/admin/forms/LockerForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { createLockerAction, deleteLockerAction, updateLockerAction } from "@/lib/admin/lockers.actions";
import { RENTBOX_TZ } from "@/lib/timezone";

export function LockersClient({
	lockers,
}: {
	lockers: (Locker & { _count: { compartments: number } })[];
}) {
	const [editing, setEditing] = React.useState<(Locker & { _count: { compartments: number } }) | null>(null);
	const [deleting, setDeleting] = React.useState<(Locker & { _count: { compartments: number } }) | null>(null);
	const [open, setOpen] = React.useState(false);

	const columns: ColumnDef<(Locker & { _count: { compartments: number } })>[] = [
		{
			key: "name",
			header: "Locker",
			cell: (l) => (
				<div className="flex flex-col">
					<span className="font-medium">{l.name}</span>
					<span className="text-xs text-[var(--rb-muted)]">{l.locationText ?? "—"}</span>
				</div>
			),
		},
		{ key: "timezone", header: "TZ", className: "w-40", cell: (l) => <span>{l.timezone}</span> },
		{ key: "compartments", header: "Compartments", className: "w-36", cell: (l) => <span>{l._count.compartments}</span> },
		{ key: "active", header: "Active", className: "w-24", cell: (l) => (l.active ? "Yes" : "No") },
		{
			key: "actions",
			header: "",
			className: "w-28",
			cell: (l) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="icon"
						title="Edit"
						onClick={() => {
							setEditing(l);
							setOpen(true);
						}}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="destructive"
						size="icon"
						title="Delete"
						onClick={() => setDeleting(l)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];

	const initial: LockerFormValues = editing
		? {
				id: editing.id,
				name: editing.name,
				locationText: editing.locationText,
				timezone: RENTBOX_TZ,
				active: editing.active,
			}
		: { name: "", locationText: null, timezone: RENTBOX_TZ, active: true };

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between space-y-0">
				<CardTitle>Lockers</CardTitle>
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
							Add locker
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{editing ? "Edit locker" : "New locker"}</DialogTitle>
						</DialogHeader>
						<LockerForm
							initial={initial}
							submitLabel={editing ? "Save changes" : "Create"}
							onSubmit={async (values) => {
								if (editing) {
									await updateLockerAction({
										id: editing.id,
										name: values.name,
										locationText: values.locationText ?? null,
										timezone: RENTBOX_TZ,
										active: values.active,
									});
								} else {
									await createLockerAction({
										name: values.name,
										locationText: values.locationText ?? null,
										timezone: RENTBOX_TZ,
										active: values.active,
									});
								}
								setOpen(false);
								window.location.reload();
							}}
						/>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent>
				<DataTable
					columns={columns}
					rows={lockers}
					empty={<div className="py-10 text-sm text-[var(--rb-muted)]">No lockers.</div>}
				/>
			</CardContent>

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(v) => !v && setDeleting(null)}
				title="Delete locker?"
				description={
					deleting
						? `This permanently deletes “${deleting.name}”. It must not have compartments.`
						: undefined
				}
				confirmLabel="Delete"
				onConfirm={async () => {
					if (!deleting) return;
					try {
						await deleteLockerAction({ id: deleting.id });
						toast.success("Deleted.");
						window.location.reload();
					} catch (e: any) {
						toast.error(e?.message ?? "Failed.");
					}
				}}
			/>
		</Card>
	);
}

