"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import type { Category } from "@prisma/client";

import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/dialogs/ConfirmDialog";
import { CategoryForm, type CategoryFormValues } from "@/components/admin/forms/CategoryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import {
	createCategoryAction,
	deleteCategoryAction,
	moveCategoryAction,
	updateCategoryAction,
} from "@/lib/admin/categories.actions";

export function CategoriesClient({ categories }: { categories: Category[] }) {
	const [editing, setEditing] = React.useState<Category | null>(null);
	const [deleting, setDeleting] = React.useState<Category | null>(null);
	const [open, setOpen] = React.useState(false);

	const columns: ColumnDef<Category>[] = [
		{
			key: "name",
			header: "Name",
			cell: (c) => (
				<div className="flex flex-col">
					<span className="font-medium">{c.name}</span>
					<span className="text-xs text-[var(--rb-muted)]">/{c.slug}</span>
				</div>
			),
		},
		{ key: "order", header: "Order", cell: (c) => <span>{c.order}</span>, className: "w-20" },
		{
			key: "active",
			header: "Active",
			cell: (c) => (
				<span className={c.active ? "text-[var(--rb-text)]" : "text-[var(--rb-muted)]"}>
					{c.active ? "Yes" : "No"}
				</span>
			),
			className: "w-24",
		},
		{
			key: "actions",
			header: "",
			className: "w-40",
			cell: (c) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="icon"
						title="Move up"
						onClick={async () => {
							try {
								await moveCategoryAction({ id: c.id, direction: "up" });
								toast.success("Reordered.");
								window.location.reload();
							} catch (e: any) {
								toast.error(e?.message ?? "Failed.");
							}
						}}
					>
						<ChevronUp className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						title="Move down"
						onClick={async () => {
							try {
								await moveCategoryAction({ id: c.id, direction: "down" });
								toast.success("Reordered.");
								window.location.reload();
							} catch (e: any) {
								toast.error(e?.message ?? "Failed.");
							}
						}}
					>
						<ChevronDown className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						title="Edit"
						onClick={() => {
							setEditing(c);
							setOpen(true);
						}}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="destructive"
						size="icon"
						title="Delete"
						onClick={() => setDeleting(c)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];

	const initial: CategoryFormValues = editing
		? {
				id: editing.id,
				name: editing.name,
				slug: editing.slug,
				description: editing.description,
				icon: editing.icon,
				order: editing.order,
				active: editing.active,
			}
		: { name: "", slug: "", description: null, icon: null, order: categories.length, active: true };

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between space-y-0">
				<CardTitle>Categories</CardTitle>

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
							Add category
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
						</DialogHeader>
						<CategoryForm
							initial={initial}
							submitLabel={editing ? "Save changes" : "Create"}
							onSubmit={async (values) => {
								if (editing) {
									await updateCategoryAction({
										id: editing.id,
										name: values.name,
										slug: values.slug,
										description: values.description ?? null,
										icon: values.icon ?? null,
										order: values.order,
										active: values.active,
									});
								} else {
									await createCategoryAction({
										name: values.name,
										slug: values.slug,
										description: values.description ?? null,
										icon: values.icon ?? null,
										order: values.order,
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
					rows={categories}
					empty={<div className="py-10 text-sm text-[var(--rb-muted)]">No categories.</div>}
				/>
			</CardContent>

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(v) => !v && setDeleting(null)}
				title="Delete category?"
				description={
					deleting
						? `This permanently deletes “${deleting.name}”. It must not have products.`
						: undefined
				}
				confirmLabel="Delete"
				onConfirm={async () => {
					if (!deleting) return;
					await deleteCategoryAction({ id: deleting.id });
					toast.success("Deleted.");
					window.location.reload();
				}}
			/>
		</Card>
	);
}

