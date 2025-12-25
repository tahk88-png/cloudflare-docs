"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BookingStatus } from "@prisma/client";
import type { Booking, Compartment, Locker, Product, User } from "@prisma/client";
import { CheckCircle2, Plus, XCircle } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { BookingForm, type BookingFormValues } from "@/components/admin/forms/BookingForm";
import { createBookingAction, setBookingStatusAction } from "@/lib/admin/bookings.actions";
import { formatTallinn } from "@/lib/timezone";

type BookingRow = Booking & {
	product: Product;
	compartment: Compartment & { locker: Locker };
	user: User | null;
};

export function BookingsClient({
	bookings,
	lockers,
	compartments,
}: {
	bookings: BookingRow[];
	lockers: Locker[];
	compartments: (Compartment & { product: Product | null })[];
}) {
	const router = useRouter();
	const params = useSearchParams();

	const [open, setOpen] = React.useState(false);
	const [cancel, setCancel] = React.useState<BookingRow | null>(null);
	const [cancelReason, setCancelReason] = React.useState("");

	const lockerId = params?.get("lockerId") ?? "all";
	const status = (params?.get("status") as BookingStatus | null) ?? "all";

	const columns: ColumnDef<BookingRow>[] = [
		{
			key: "time",
			header: "Time (Tallinn)",
			cell: (b) => (
				<div className="flex flex-col">
					<span className="font-medium">
						{formatTallinn(new Date(b.startsAt))} → {formatTallinn(new Date(b.endsAt))}
					</span>
					<span className="text-xs text-[var(--rb-muted)]">{b.compartment.locker.name}</span>
				</div>
			),
		},
		{
			key: "product",
			header: "Product",
			cell: (b) => (
				<div className="flex flex-col">
					<span>{b.product.name}</span>
					<span className="text-xs text-[var(--rb-muted)]">
						{b.compartment.label}
					</span>
				</div>
			),
		},
		{ key: "status", header: "Status", className: "w-28", cell: (b) => b.status },
		{ key: "user", header: "User", className: "w-48", cell: (b) => b.user?.email ?? "—" },
		{
			key: "actions",
			header: "",
			className: "w-44",
			cell: (b) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="icon"
						title="Confirm"
						disabled={b.status !== BookingStatus.pending}
						onClick={async () => {
							try {
								await setBookingStatusAction({ id: b.id, status: BookingStatus.confirmed });
								toast.success("Confirmed.");
								window.location.reload();
							} catch (e: any) {
								toast.error(e?.message ?? "Failed.");
							}
						}}
					>
						<CheckCircle2 className="h-4 w-4" />
					</Button>
					<Button
						variant="destructive"
						size="icon"
						title="Cancel"
						disabled={
							!(
								b.status === BookingStatus.pending ||
								b.status === BookingStatus.confirmed
							)
						}
						onClick={() => {
							setCancel(b);
							setCancelReason("");
						}}
					>
						<XCircle className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];

	const compOptions = compartments.map((c) => ({
		id: c.id,
		lockerId: c.lockerId,
		label: c.label,
		productName: c.product?.name ?? null,
	}));

	const initial: BookingFormValues = {
		lockerId: lockers[0]?.id ?? "",
		compartmentId: compOptions[0]?.id ?? "",
		startsLocal: "",
		endsLocal: "",
		status: BookingStatus.pending,
	};

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between space-y-0">
				<CardTitle>Bookings</CardTitle>
				<div className="flex items-center gap-2">
					<div className="grid gap-2">
						<Label className="sr-only">Locker</Label>
						<Select
							value={lockerId}
							onValueChange={(v) => {
								const next = new URLSearchParams(params?.toString());
								if (v === "all") next.delete("lockerId");
								else next.set("lockerId", v);
								router.push(`/admin/bookings?${next.toString()}`);
							}}
						>
							<SelectTrigger className="w-44">
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
					<div className="grid gap-2">
						<Label className="sr-only">Status</Label>
						<Select
							value={status}
							onValueChange={(v) => {
								const next = new URLSearchParams(params?.toString());
								if (v === "all") next.delete("status");
								else next.set("status", v);
								router.push(`/admin/bookings?${next.toString()}`);
							}}
						>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="All statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value={BookingStatus.pending}>pending</SelectItem>
								<SelectItem value={BookingStatus.confirmed}>confirmed</SelectItem>
								<SelectItem value={BookingStatus.cancelled}>cancelled</SelectItem>
								<SelectItem value={BookingStatus.completed}>completed</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button className="gap-2">
								<Plus className="h-4 w-4" />
								Add booking
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle>New booking</DialogTitle>
							</DialogHeader>
							<BookingForm
								initial={initial}
								lockers={lockers.map((l) => ({ id: l.id, name: l.name }))}
								compartments={compOptions}
								submitLabel="Create"
								onSubmit={async (v) => {
									await createBookingAction({
										compartmentId: v.compartmentId,
										startsLocal: v.startsLocal,
										endsLocal: v.endsLocal,
										status: v.status,
									} as any);
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
					rows={bookings}
					empty={<div className="py-10 text-sm text-[var(--rb-muted)]">No bookings.</div>}
				/>
			</CardContent>

			<Dialog open={!!cancel} onOpenChange={(v) => !v && setCancel(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel booking</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label>Reason</Label>
						<Textarea
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							placeholder="Required"
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setCancel(null)}>
							Back
						</Button>
						<Button
							variant="destructive"
							onClick={async () => {
								if (!cancel) return;
								try {
									await setBookingStatusAction({
										id: cancel.id,
										status: BookingStatus.cancelled,
										cancelReason,
									});
									toast.success("Cancelled.");
									setCancel(null);
									window.location.reload();
								} catch (e: any) {
									toast.error(e?.message ?? "Failed.");
								}
							}}
						>
							Cancel booking
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

