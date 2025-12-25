"use server";

import { BookingStatus, Role } from "@prisma/client";
import { z } from "zod";

import { adminContext } from "@/lib/admin/action";
import {
	bookingCreateSchema,
	bookingUpdateSchema,
	createBooking,
	updateBooking,
	setBookingStatus,
} from "@/lib/admin/bookings";

export async function createBookingAction(input: z.infer<typeof bookingCreateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin, Role.operator],
		rateLimit: { key: "booking.create", limit: 40 },
	});
	return createBooking(ctx, bookingCreateSchema.parse(input));
}

export async function updateBookingAction(input: z.infer<typeof bookingUpdateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin, Role.operator],
		rateLimit: { key: "booking.update", limit: 60 },
	});
	return updateBooking(ctx, bookingUpdateSchema.parse(input));
}

export async function setBookingStatusAction(input: { id: string; status: BookingStatus; cancelReason?: string }) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin, Role.operator],
		rateLimit: { key: `booking.status.${input.status}`, limit: 120 },
	});
	return setBookingStatus(ctx, input);
}

