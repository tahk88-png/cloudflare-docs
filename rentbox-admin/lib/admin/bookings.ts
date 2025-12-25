import { prisma } from '@/lib/db/prisma';
import { BookingStatus } from '@prisma/client';

export interface BookingOverlap {
  hasOverlap: boolean;
  conflictingBookings?: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: BookingStatus;
  }>;
}

/**
 * Check if a booking time range overlaps with existing bookings
 * for the same compartment (excluding cancelled bookings)
 */
export async function checkBookingOverlap(
  compartmentId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string
): Promise<BookingOverlap> {
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      compartmentId,
      status: {
        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      AND: [
        {
          startsAt: {
            lt: endsAt,
          },
        },
        {
          endsAt: {
            gt: startsAt,
          },
        },
      ],
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
  });

  return {
    hasOverlap: overlappingBookings.length > 0,
    conflictingBookings: overlappingBookings.length > 0 ? overlappingBookings : undefined,
  };
}

/**
 * Validate booking dates
 */
export function validateBookingDates(startsAt: Date, endsAt: Date): { valid: boolean; error?: string } {
  const now = new Date();

  if (startsAt >= endsAt) {
    return { valid: false, error: 'End time must be after start time' };
  }

  if (startsAt < now) {
    return { valid: false, error: 'Start time cannot be in the past' };
  }

  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60);
  
  if (durationMinutes < 15) {
    return { valid: false, error: 'Booking must be at least 15 minutes long' };
  }

  return { valid: true };
}

/**
 * Get upcoming bookings for a compartment
 */
export async function getCompartmentUpcomingBookings(compartmentId: string, limit: number = 10) {
  const now = new Date();
  
  return prisma.booking.findMany({
    where: {
      compartmentId,
      status: {
        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      },
      startsAt: {
        gte: now,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      startsAt: 'asc',
    },
    take: limit,
  });
}

/**
 * Get bookings within a date range
 */
export async function getBookingsInRange(startsAt: Date, endsAt: Date) {
  return prisma.booking.findMany({
    where: {
      OR: [
        {
          AND: [
            { startsAt: { gte: startsAt } },
            { startsAt: { lte: endsAt } },
          ],
        },
        {
          AND: [
            { endsAt: { gte: startsAt } },
            { endsAt: { lte: endsAt } },
          ],
        },
        {
          AND: [
            { startsAt: { lte: startsAt } },
            { endsAt: { gte: endsAt } },
          ],
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      compartment: {
        select: {
          id: true,
          label: true,
          locker: {
            select: {
              id: true,
              name: true,
              locationText: true,
            },
          },
        },
      },
    },
    orderBy: {
      startsAt: 'asc',
    },
  });
}

/**
 * Get today's bookings count
 */
export async function getTodayBookingsCount(): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  return prisma.booking.count({
    where: {
      startsAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      },
    },
  });
}

/**
 * Get upcoming bookings in next 24 hours
 */
export async function getUpcoming24HoursBookingsCount(): Promise<number> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return prisma.booking.count({
    where: {
      startsAt: {
        gte: now,
        lte: in24Hours,
      },
      status: {
        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      },
    },
  });
}
