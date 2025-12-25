"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function slugify(input: string) {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");
}

export type CategoryFormValues = {
	id?: string;
	name: string;
	slug: string;
	description?: string | null;
	icon?: string | null;
	order: number;
	active: boolean;
};

export function CategoryForm({
	initial,
	onSubmit,
	submitLabel = "Save",
}: {
	initial: CategoryFormValues;
	submitLabel?: string;
	onSubmit: (values: CategoryFormValues) => Promise<void>;
}) {
	const [values, setValues] = React.useState<CategoryFormValues>(initial);
	const [busy, setBusy] = React.useState(false);
	const [slugTouched, setSlugTouched] = React.useState(false);

	React.useEffect(() => {
		setValues(initial);
		setSlugTouched(false);
	}, [initial]);

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
						setValues((v) => ({
							...v,
							name,
							slug: slugTouched ? v.slug : slugify(name),
						}));
					}}
					placeholder="e.g. Power tools"
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
					placeholder="e.g. power-tools"
					required
				/>
				<p className="text-xs text-[var(--rb-muted)]">Kebab-case, unique.</p>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="icon">Icon (optional)</Label>
				<Input
					id="icon"
					value={values.icon ?? ""}
					onChange={(e) => setValues((v) => ({ ...v, icon: e.target.value || null }))}
					placeholder="e.g. drill"
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					value={values.description ?? ""}
					onChange={(e) =>
						setValues((v) => ({ ...v, description: e.target.value || null }))
					}
					placeholder="Short description for admins."
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="order">Order</Label>
				<Input
					id="order"
					type="number"
					value={values.order}
					onChange={(e) =>
						setValues((v) => ({ ...v, order: Number(e.target.value) || 0 }))
					}
					min={0}
				/>
			</div>

			<div className="flex items-center justify-between rounded-xl border border-[var(--rb-border)] bg-white p-3">
				<div>
					<div className="text-sm font-medium">Active</div>
					<div className="text-xs text-[var(--rb-muted)]">
						Inactive categories are hidden for operations.
					</div>
				</div>
				<Switch
					checked={values.active}
					onCheckedChange={(active) => setValues((v) => ({ ...v, active }))}
				/>
			</div>

			<div className="flex justify-end gap-2">
				<Button type="submit" disabled={busy}>
					{busy ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}

