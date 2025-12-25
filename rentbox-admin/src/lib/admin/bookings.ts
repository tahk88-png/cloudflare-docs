import prisma from "@/lib/db/prisma";
import type {
  BookingWithRelations,
  BookingFilters,
  PaginatedResponse,
  BookingStatus,
} from "@/lib/types";
import { createAuditLog, createAuditDiff } from "./audit";

/**
 * Check for booking overlaps for a specific compartment
 * Returns true if there's an overlap (conflict)
 */
export async function checkBookingOverlap(
  compartmentId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const overlappingBookings = await prisma.booking.findFirst({
    where: {
      compartmentId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ["pending", "confirmed"] },
      OR: [
        // New booking starts during existing booking
        {
          startsAt: { lte: startsAt },
          endsAt: { gt: startsAt },
        },
        // New booking ends during existing booking
        {
          startsAt: { lt: endsAt },
          endsAt: { gte: endsAt },
        },
        // New booking completely contains existing booking
        {
          startsAt: { gte: startsAt },
          endsAt: { lte: endsAt },
        },
      ],
    },
  });

  return overlappingBookings !== null;
}

/**
 * Get available time slots for a compartment on a given date
 */
export async function getAvailableSlots(
  compartmentId: string,
  date: Date,
  slotMinutes: number = 15
): Promise<{ start: Date; end: Date }[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      compartmentId,
      status: { in: ["pending", "confirmed"] },
      OR: [
        { startsAt: { gte: dayStart, lte: dayEnd } },
        { endsAt: { gte: dayStart, lte: dayEnd } },
        {
          startsAt: { lte: dayStart },
          endsAt: { gte: dayEnd },
        },
      ],
    },
    orderBy: { startsAt: "asc" },
  });

  // Generate all slots for the day
  const slots: { start: Date; end: Date }[] = [];
  const slotMs = slotMinutes * 60 * 1000;

  let currentTime = dayStart.getTime();
  while (currentTime < dayEnd.getTime()) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime + slotMs);

    // Check if slot overlaps with any booking
    const isAvailable = !bookings.some(
      (booking) =>
        slotStart < booking.endsAt && slotEnd > booking.startsAt
    );

    if (isAvailable) {
      slots.push({ start: slotStart, end: slotEnd });
    }

    currentTime += slotMs;
  }

  return slots;
}

/**
 * Get bookings with pagination and filters
 */
export async function getBookings(params: {
  page?: number;
  pageSize?: number;
  filters?: BookingFilters;
}): Promise<PaginatedResponse<BookingWithRelations>> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const skip = (page - 1) * pageSize;
  const filters = params.filters || {};

  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.productId && { productId: filters.productId }),
    ...(filters.compartmentId && { compartmentId: filters.compartmentId }),
    ...(filters.lockerId && {
      compartment: { lockerId: filters.lockerId },
    }),
    ...(filters.dateFrom || filters.dateTo
      ? {
          startsAt: {
            ...(filters.dateFrom && { gte: filters.dateFrom }),
            ...(filters.dateTo && { lte: filters.dateTo }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user: true,
        product: true,
        compartment: {
          include: {
            locker: true,
            product: true,
          },
        },
      },
      orderBy: { startsAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items: items as BookingWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(
  id: string
): Promise<BookingWithRelations | null> {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: true,
      product: true,
      compartment: {
        include: {
          locker: true,
          product: true,
        },
      },
    },
  });

  return booking as BookingWithRelations | null;
}

/**
 * Create a new booking
 */
export async function createBooking(
  data: {
    userId?: string | null;
    productId: string;
    compartmentId: string;
    startsAt: Date;
    endsAt: Date;
    status?: BookingStatus;
    notes?: string;
  },
  actorUserId: string
): Promise<BookingWithRelations> {
  // Verify compartment exists and get product
  const compartment = await prisma.compartment.findUnique({
    where: { id: data.compartmentId },
    include: { product: true },
  });

  if (!compartment) {
    throw new Error("Compartment not found");
  }

  if (!compartment.active) {
    throw new Error("Compartment is not active (in maintenance)");
  }

  // Check for overlaps
  const hasOverlap = await checkBookingOverlap(
    data.compartmentId,
    data.startsAt,
    data.endsAt
  );

  if (hasOverlap) {
    throw new Error("Booking time conflicts with existing booking");
  }

  // Calculate total price
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const durationMs = data.endsAt.getTime() - data.startsAt.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const totalPrice =
    product.priceUnit === "hour"
      ? Number(product.basePrice) * durationHours
      : Number(product.basePrice) * Math.ceil(durationHours / 24);

  const booking = await prisma.booking.create({
    data: {
      userId: data.userId,
      productId: data.productId,
      compartmentId: data.compartmentId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      status: data.status || "pending",
      notes: data.notes,
      totalPrice,
    },
    include: {
      user: true,
      product: true,
      compartment: {
        include: {
          locker: true,
          product: true,
        },
      },
    },
  });

  await createAuditLog({
    actorUserId,
    action: "create",
    entityType: "booking",
    entityId: booking.id,
    after: booking as unknown as Record<string, unknown>,
  });

  return booking as BookingWithRelations;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  actorUserId: string,
  cancelReason?: string
): Promise<BookingWithRelations> {
  const existing = await prisma.booking.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Booking not found");
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status,
      ...(cancelReason && { cancelReason }),
    },
    include: {
      user: true,
      product: true,
      compartment: {
        include: {
          locker: true,
          product: true,
        },
      },
    },
  });

  await createAuditLog({
    actorUserId,
    action: "status_change",
    entityType: "booking",
    entityId: booking.id,
    ...createAuditDiff(
      existing as unknown as Record<string, unknown>,
      booking as unknown as Record<string, unknown>
    ),
  });

  return booking as BookingWithRelations;
}

/**
 * Get today's bookings count
 */
export async function getTodayBookingsCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.booking.count({
    where: {
      status: { in: ["pending", "confirmed"] },
      OR: [
        {
          startsAt: { gte: today, lt: tomorrow },
        },
        {
          startsAt: { lt: today },
          endsAt: { gt: today },
        },
      ],
    },
  });
}

/**
 * Get upcoming bookings in next 24 hours
 */
export async function getUpcoming24hBookingsCount(): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return prisma.booking.count({
    where: {
      status: { in: ["pending", "confirmed"] },
      startsAt: { gte: now, lt: in24h },
    },
  });
}

/**
 * Find booking conflicts (should be 0 in normal operation)
 */
export async function findBookingConflicts(): Promise<
  { compartmentId: string; count: number }[]
> {
  // This is a simplified check - in production, use raw SQL for efficiency
  const compartments = await prisma.compartment.findMany({
    where: { active: true },
    select: { id: true },
  });

  const conflicts: { compartmentId: string; count: number }[] = [];

  for (const comp of compartments) {
    const bookings = await prisma.booking.findMany({
      where: {
        compartmentId: comp.id,
        status: { in: ["pending", "confirmed"] },
        endsAt: { gt: new Date() },
      },
      orderBy: { startsAt: "asc" },
    });

    // Check for overlaps between consecutive bookings
    for (let i = 0; i < bookings.length - 1; i++) {
      if (bookings[i].endsAt > bookings[i + 1].startsAt) {
        const existing = conflicts.find((c) => c.compartmentId === comp.id);
        if (existing) {
          existing.count++;
        } else {
          conflicts.push({ compartmentId: comp.id, count: 1 });
        }
      }
    }
  }

  return conflicts;
}
