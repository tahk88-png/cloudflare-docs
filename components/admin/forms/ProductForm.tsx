"use client";

import * as React from "react";
import { toast } from "sonner";
import { PriceUnit } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function slugify(input: string) {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");
}

export type ProductFormValues = {
	id?: string;
	name: string;
	slug: string;
	shortDescription?: string | null;
	description?: string | null;
	categoryId: string;
	basePriceCents: number;
	priceUnit: PriceUnit;
	slotMinutes: number;
	minRentalMinutes: number;
	maxRentalMinutes?: number | null;
	active: boolean;
	tagNames: string;
	imageUrls: string;
};

export function ProductForm({
	initial,
	categories,
	submitLabel = "Save",
	onSubmit,
}: {
	initial: ProductFormValues;
	categories: { id: string; name: string }[];
	submitLabel?: string;
	onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
	const [values, setValues] = React.useState<ProductFormValues>(initial);
	const [busy, setBusy] = React.useState(false);
	const [slugTouched, setSlugTouched] = React.useState(false);

	React.useEffect(() => {
		setValues(initial);
		setSlugTouched(false);
	}, [initial]);

	const basePriceEuro = (values.basePriceCents / 100).toFixed(2);

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
					onChange={(e) => {
						const name = e.target.value;
						setValues((v) => ({ ...v, name, slug: slugTouched ? v.slug : slugify(name) }));
					}}
					placeholder="e.g. Cordless Drill"
					required
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="slug">Slug</Label>
				<Input
					id="slug"
					value={values.slug}
					onChange={(e) => {
						setSlugTouched(true);
						setValues((v) => ({ ...v, slug: e.target.value }));
					}}
					placeholder="e.g. cordless-drill"
					required
				/>
			</div>

			<div className="grid gap-2">
				<Label>Category</Label>
				<Select
					value={values.categoryId}
					onValueChange={(categoryId) => setValues((v) => ({ ...v, categoryId }))}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select category" />
					</SelectTrigger>
					<SelectContent>
						{categories.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="short">Short description</Label>
				<Input
					id="short"
					value={values.shortDescription ?? ""}
					onChange={(e) =>
						setValues((v) => ({ ...v, shortDescription: e.target.value || null }))
					}
					placeholder="One line"
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="desc">Description</Label>
				<Textarea
					id="desc"
					value={values.description ?? ""}
					onChange={(e) =>
						setValues((v) => ({ ...v, description: e.target.value || null }))
					}
					placeholder="Detailed description"
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label>Base price (€)</Label>
					<Input
						value={basePriceEuro}
						onChange={(e) => {
							const v = Number(e.target.value);
							const cents = Number.isFinite(v) ? Math.round(v * 100) : 0;
							setValues((x) => ({ ...x, basePriceCents: Math.max(0, cents) }));
						}}
						inputMode="decimal"
					/>
				</div>
				<div className="grid gap-2">
					<Label>Unit</Label>
					<Select
						value={values.priceUnit}
						onValueChange={(priceUnit) => setValues((v) => ({ ...v, priceUnit: priceUnit as PriceUnit }))}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={PriceUnit.hour}>hour</SelectItem>
							<SelectItem value={PriceUnit.day}>day</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="grid gap-2">
					<Label>Slot minutes</Label>
					<Input
						type="number"
						value={values.slotMinutes}
						onChange={(e) => setValues((v) => ({ ...v, slotMinutes: Number(e.target.value) || 15 }))}
						min={5}
					/>
				</div>
				<div className="grid gap-2">
					<Label>Min rental (min)</Label>
					<Input
						type="number"
						value={values.minRentalMinutes}
						onChange={(e) =>
							setValues((v) => ({ ...v, minRentalMinutes: Number(e.target.value) || 60 }))
						}
						min={5}
					/>
				</div>
				<div className="grid gap-2">
					<Label>Max rental (min)</Label>
					<Input
						type="number"
						value={values.maxRentalMinutes ?? ""}
						onChange={(e) =>
							setValues((v) => ({
								...v,
								maxRentalMinutes: e.target.value ? Number(e.target.value) : null,
							}))
						}
						min={5}
					/>
				</div>
			</div>

			<div className="grid gap-2">
				<Label>Tags</Label>
				<Input
					value={values.tagNames}
					onChange={(e) => setValues((v) => ({ ...v, tagNames: e.target.value }))}
					placeholder="comma-separated, e.g. popular, cordless, diy"
				/>
			</div>

			<div className="grid gap-2">
				<Label>Images (URLs)</Label>
				<Textarea
					value={values.imageUrls}
					onChange={(e) => setValues((v) => ({ ...v, imageUrls: e.target.value }))}
					placeholder={"One URL per line. First is primary."}
				/>
			</div>

			<div className="flex items-center justify-between rounded-xl border border-[var(--rb-border)] bg-white p-3">
				<div>
					<div className="text-sm font-medium">Active</div>
					<div className="text-xs text-[var(--rb-muted)]">
						Inactive products cannot be booked.
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

