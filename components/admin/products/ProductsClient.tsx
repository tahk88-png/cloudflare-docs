"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Category, Product, PriceUnit } from "@prisma/client";

import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/dialogs/ConfirmDialog";
import { ProductForm, type ProductFormValues } from "@/components/admin/forms/ProductForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { createProductAction, deleteProductAction, updateProductAction } from "@/lib/admin/products.actions";

type ProductRow = Product & { category: Category; _count: { compartments: number } };

function formatPrice(cents: number, unit: PriceUnit) {
	return `€${(cents / 100).toFixed(2)} / ${unit}`;
}

export function ProductsClient({
	data,
	categories,
}: {
	data: { items: ProductRow[]; total: number; page: number; pageSize: number };
	categories: { id: string; name: string }[];
}) {
	const router = useRouter();
	const params = useSearchParams();
	const q = params?.get("q") ?? "";

	const [search, setSearch] = React.useState(q);
	const [open, setOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<ProductRow | null>(null);
	const [deleting, setDeleting] = React.useState<ProductRow | null>(null);

	React.useEffect(() => setSearch(q), [q]);
	React.useEffect(() => {
		const t = setTimeout(() => {
			const next = new URLSearchParams(params?.toString());
			if (search.trim()) next.set("q", search.trim());
			else next.delete("q");
			next.delete("page");
			router.push(`/admin/products?${next.toString()}`);
		}, 250);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	const columns: ColumnDef<ProductRow>[] = [
		{
			key: "name",
			header: "Name",
			cell: (p) => (
				<div className="flex flex-col">
					<span className="font-medium">{p.name}</span>
					<span className="text-xs text-[var(--rb-muted)]">/{p.slug}</span>
				</div>
			),
		},
		{ key: "category", header: "Category", className: "w-48", cell: (p) => <span>{p.category.name}</span> },
		{ key: "price", header: "Price", className: "w-40", cell: (p) => <span>{formatPrice(p.basePrice, p.priceUnit)}</span> },
		{ key: "compartments", header: "Compartments", className: "w-28", cell: (p) => <span>{p._count.compartments}</span> },
		{ key: "active", header: "Active", className: "w-20", cell: (p) => (p.active ? "Yes" : "No") },
		{
			key: "actions",
			header: "",
			className: "w-28",
			cell: (p) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="icon"
						title="Edit"
						onClick={() => {
							setEditing(p);
							setOpen(true);
						}}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="destructive"
						size="icon"
						title="Delete"
						onClick={() => setDeleting(p)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];

	const initial: ProductFormValues = editing
		? {
				id: editing.id,
				name: editing.name,
				slug: editing.slug,
				shortDescription: editing.shortDescription,
				description: editing.description,
				categoryId: editing.categoryId,
				basePriceCents: editing.basePrice,
				priceUnit: editing.priceUnit,
				slotMinutes: editing.slotMinutes,
				minRentalMinutes: editing.minRentalMinutes,
				maxRentalMinutes: editing.maxRentalMinutes,
				active: editing.active,
				tagNames: "",
				imageUrls: "",
			}
		: {
				name: "",
				slug: "",
				shortDescription: null,
				description: null,
				categoryId: categories[0]?.id ?? "",
				basePriceCents: 0,
				priceUnit: "day" as any,
				slotMinutes: 15,
				minRentalMinutes: 60,
				maxRentalMinutes: null,
				active: true,
				tagNames: "",
				imageUrls: "",
			};

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between space-y-0">
				<CardTitle>Products</CardTitle>
				<div className="flex items-center gap-2">
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search…"
						className="w-56"
					/>
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
								Add product
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
							</DialogHeader>
							<ProductForm
								initial={initial}
								categories={categories}
								submitLabel={editing ? "Save changes" : "Create"}
								onSubmit={async (v) => {
									const tagNames = v.tagNames
										.split(",")
										.map((t) => t.trim())
										.filter(Boolean);
									const imageUrls = v.imageUrls
										.split("\n")
										.map((s) => s.trim())
										.filter(Boolean);

									if (editing) {
										await updateProductAction({
											id: editing.id,
											name: v.name,
											slug: v.slug,
											shortDescription: v.shortDescription ?? null,
											description: v.description ?? null,
											categoryId: v.categoryId,
											basePrice: v.basePriceCents,
											priceUnit: v.priceUnit,
											slotMinutes: v.slotMinutes,
											minRentalMinutes: v.minRentalMinutes,
											maxRentalMinutes: v.maxRentalMinutes ?? null,
											active: v.active,
											tagNames,
											imageUrls,
										});
									} else {
										await createProductAction({
											name: v.name,
											slug: v.slug,
											shortDescription: v.shortDescription ?? null,
											description: v.description ?? null,
											categoryId: v.categoryId,
											basePrice: v.basePriceCents,
											priceUnit: v.priceUnit,
											slotMinutes: v.slotMinutes,
											minRentalMinutes: v.minRentalMinutes,
											maxRentalMinutes: v.maxRentalMinutes ?? null,
											active: v.active,
											tagNames,
											imageUrls,
										});
									}
									setOpen(false);
									window.location.reload();
								}}
							/>
						</DialogContent>
					</Dialog>
				</div>
			</CardHeader>
			<CardContent>
				<DataTable
					columns={columns}
					rows={data.items}
					empty={<div className="py-10 text-sm text-[var(--rb-muted)]">No products.</div>}
				/>
			</CardContent>

			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(v) => !v && setDeleting(null)}
				title="Delete product?"
				description={
					deleting
						? `This permanently deletes “${deleting.name}”. It must not be assigned or have bookings.`
						: undefined
				}
				confirmLabel="Delete"
				onConfirm={async () => {
					if (!deleting) return;
					try {
						await deleteProductAction({ id: deleting.id });
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

