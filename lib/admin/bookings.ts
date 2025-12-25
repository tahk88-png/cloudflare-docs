import "server-only";

import { z } from "zod";
import { BookingStatus, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/action";
import { tallinnLocalPartsToUtc } from "@/lib/timezone";

export const bookingCreateSchema = z.object({
	compartmentId: z.string().min(1),
	// If omitted, inferred from compartment assignment.
	productId: z.string().min(1).optional().nullable(),
	userId: z.string().min(1).optional().nullable(),
	startsLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
	endsLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
	status: z.nativeEnum(BookingStatus).default(BookingStatus.pending),
	paymentStatus: z.nativeEnum(PaymentStatus).optional().nullable(),
});

export const bookingUpdateSchema = bookingCreateSchema.extend({
	id: z.string().min(1),
});

function parseTallinnLocal(value: string) {
	const [datePart, timePart] = value.split("T");
	if (!datePart || !timePart) throw new Error("Invalid datetime.");
	const [y, m, d] = datePart.split("-").map(Number);
	const [hh, mm] = timePart.split(":").map(Number);
	return tallinnLocalPartsToUtc({
		year: y!,
		month: m!,
		day: d!,
		hour: hh!,
		minute: mm!,
	});
}

export async function assertNoOverlap(input: {
	compartmentId: string;
	startsAt: Date;
	endsAt: Date;
	excludeBookingId?: string;
}) {
	const overlap = await prisma.booking.findFirst({
		where: {
			compartmentId: input.compartmentId,
			status: { in: [BookingStatus.pending, BookingStatus.confirmed] },
			id: input.excludeBookingId ? { not: input.excludeBookingId } : undefined,
			startsAt: { lt: input.endsAt },
			endsAt: { gt: input.startsAt },
		},
		select: { id: true, startsAt: true, endsAt: true, status: true },
	});
	if (overlap) {
		throw new Error("Booking conflict: compartment already booked for that time.");
	}
}

export async function listBookings(input?: {
	fromUtc?: Date;
	toUtc?: Date;
	status?: BookingStatus;
	lockerId?: string;
	productId?: string;
	compartmentId?: string;
}) {
	return prisma.booking.findMany({
		where: {
			startsAt: input?.fromUtc ? { gte: input.fromUtc } : undefined,
			endsAt: input?.toUtc ? { lte: input.toUtc } : undefined,
			status: input?.status,
			productId: input?.productId,
			compartmentId: input?.compartmentId,
			compartment: input?.lockerId ? { lockerId: input.lockerId } : undefined,
		},
		orderBy: [{ startsAt: "asc" }],
		include: {
			product: true,
			compartment: { include: { locker: true } },
			user: true,
		},
	});
}

export async function createBooking(ctx: AdminContext, input: z.infer<typeof bookingCreateSchema>) {
	const startsAt = parseTallinnLocal(input.startsLocal);
	const endsAt = parseTallinnLocal(input.endsLocal);

	if (!(endsAt > startsAt)) throw new Error("Invalid booking: ends_at must be after starts_at.");
	if (startsAt < new Date()) throw new Error("Invalid booking: cannot be in the past.");

	const compartment = await prisma.compartment.findUnique({
		where: { id: input.compartmentId },
	});
	if (!compartment) throw new Error("Compartment not found.");
	if (!compartment.active) throw new Error("Cannot book an inactive compartment.");

	const productId = input.productId ?? compartment.productId;
	if (!productId) throw new Error("Compartment has no product assigned.");

	const product = await prisma.product.findUnique({ where: { id: productId } });
	if (!product) throw new Error("Product not found.");
	if (!product.active) throw new Error("Cannot book an inactive product.");

	await assertNoOverlap({ compartmentId: compartment.id, startsAt, endsAt });

	const created = await prisma.booking.create({
		data: {
			userId: input.userId ?? null,
			productId,
			compartmentId: compartment.id,
			startsAt,
			endsAt,
			status: input.status,
			paymentStatus: input.paymentStatus ?? null,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "booking.create",
		entityType: "booking",
		entityId: created.id,
		beforeJson: null,
		afterJson: created,
		ip: ctx.ip,
	});

	return created;
}

export async function updateBooking(ctx: AdminContext, input: z.infer<typeof bookingUpdateSchema>) {
	const before = await prisma.booking.findUnique({ where: { id: input.id } });
	if (!before) throw new Error("Booking not found.");

	const startsAt = parseTallinnLocal(input.startsLocal);
	const endsAt = parseTallinnLocal(input.endsLocal);
	if (!(endsAt > startsAt)) throw new Error("Invalid booking: ends_at must be after starts_at.");
	if (startsAt < new Date()) throw new Error("Invalid booking: cannot be in the past.");

	await assertNoOverlap({
		compartmentId: input.compartmentId,
		startsAt,
		endsAt,
		excludeBookingId: input.id,
	});

	const updated = await prisma.booking.update({
		where: { id: input.id },
		data: {
			userId: input.userId ?? null,
			productId: input.productId ?? before.productId,
			compartmentId: input.compartmentId,
			startsAt,
			endsAt,
			status: input.status,
			paymentStatus: input.paymentStatus ?? null,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: "booking.update",
		entityType: "booking",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

export async function setBookingStatus(ctx: AdminContext, input: { id: string; status: BookingStatus; cancelReason?: string }) {
	const before = await prisma.booking.findUnique({ where: { id: input.id } });
	if (!before) throw new Error("Booking not found.");

	if (input.status === BookingStatus.cancelled && !input.cancelReason?.trim()) {
		throw new Error("Cancel reason is required.");
	}

	const updated = await prisma.booking.update({
		where: { id: input.id },
		data: {
			status: input.status,
			cancelReason: input.status === BookingStatus.cancelled ? input.cancelReason!.trim() : null,
		},
	});

	await writeAuditLog({
		actorUserId: ctx.actor.id,
		action: `booking.status.${input.status}`,
		entityType: "booking",
		entityId: updated.id,
		beforeJson: before,
		afterJson: updated,
		ip: ctx.ip,
	});

	return updated;
}

