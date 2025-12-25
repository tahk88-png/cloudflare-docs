'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requirePermission } from '@/lib/auth/rbac';
import { checkBookingOverlap, validateBookingDates } from '@/lib/admin/bookings';
import { logCreate, logUpdate, logStatusChange, logDelete } from '@/lib/admin/audit';
import { revalidatePath } from 'next/cache';
import { BookingStatus } from '@prisma/client';

const createBookingSchema = z.object({
  userId: z.string().optional().nullable(),
  productId: z.string(),
  compartmentId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.nativeEnum(BookingStatus).default(BookingStatus.PENDING),
});

const updateBookingSchema = z.object({
  id: z.string(),
  userId: z.string().optional().nullable(),
  productId: z.string().optional(),
  compartmentId: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
});

const cancelBookingSchema = z.object({
  id: z.string(),
  reason: z.string().min(1, 'Cancel reason is required'),
});

export async function createBooking(data: z.infer<typeof createBookingSchema>) {
  try {
    await requirePermission('bookings:create');

    const validated = createBookingSchema.parse(data);
    const startsAt = new Date(validated.startsAt);
    const endsAt = new Date(validated.endsAt);

    // Validate dates
    const dateValidation = validateBookingDates(startsAt, endsAt);
    if (!dateValidation.valid) {
      return { error: dateValidation.error };
    }

    // Check for overlaps
    const overlapCheck = await checkBookingOverlap(
      validated.compartmentId,
      startsAt,
      endsAt
    );

    if (overlapCheck.hasOverlap) {
      return {
        error: 'Booking conflicts with existing reservations',
        conflicts: overlapCheck.conflictingBookings,
      };
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: validated.userId,
        productId: validated.productId,
        compartmentId: validated.compartmentId,
        startsAt,
        endsAt,
        status: validated.status,
      },
      include: {
        product: true,
        compartment: {
          include: {
            locker: true,
          },
        },
        user: true,
      },
    });

    await logCreate('booking', booking.id, booking);
    revalidatePath('/admin/bookings');
    revalidatePath('/admin');

    return { success: true, booking };
  } catch (error) {
    console.error('Create booking error:', error);
    if (error instanceof z.ZodError) {
      return { error: 'Validation failed', details: error.issues };
    }
    return { error: 'Failed to create booking' };
  }
}

export async function updateBooking(data: z.infer<typeof updateBookingSchema>) {
  try {
    await requirePermission('bookings:update');

    const validated = updateBookingSchema.parse(data);

    const existingBooking = await prisma.booking.findUnique({
      where: { id: validated.id },
    });

    if (!existingBooking) {
      return { error: 'Booking not found' };
    }

    // If updating dates, validate and check overlaps
    if (validated.startsAt || validated.endsAt) {
      const startsAt = validated.startsAt ? new Date(validated.startsAt) : existingBooking.startsAt;
      const endsAt = validated.endsAt ? new Date(validated.endsAt) : existingBooking.endsAt;

      const dateValidation = validateBookingDates(startsAt, endsAt);
      if (!dateValidation.valid) {
        return { error: dateValidation.error };
      }

      const compartmentId = validated.compartmentId || existingBooking.compartmentId;
      const overlapCheck = await checkBookingOverlap(
        compartmentId,
        startsAt,
        endsAt,
        validated.id
      );

      if (overlapCheck.hasOverlap) {
        return {
          error: 'Booking conflicts with existing reservations',
          conflicts: overlapCheck.conflictingBookings,
        };
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: validated.id },
      data: {
        ...(validated.userId !== undefined && { userId: validated.userId }),
        ...(validated.productId && { productId: validated.productId }),
        ...(validated.compartmentId && { compartmentId: validated.compartmentId }),
        ...(validated.startsAt && { startsAt: new Date(validated.startsAt) }),
        ...(validated.endsAt && { endsAt: new Date(validated.endsAt) }),
        ...(validated.status && { status: validated.status }),
      },
      include: {
        product: true,
        compartment: {
          include: {
            locker: true,
          },
        },
        user: true,
      },
    });

    await logUpdate('booking', updatedBooking.id, existingBooking, updatedBooking);
    revalidatePath('/admin/bookings');
    revalidatePath('/admin');

    return { success: true, booking: updatedBooking };
  } catch (error) {
    console.error('Update booking error:', error);
    if (error instanceof z.ZodError) {
      return { error: 'Validation failed', details: error.issues };
    }
    return { error: 'Failed to update booking' };
  }
}

export async function cancelBooking(data: z.infer<typeof cancelBookingSchema>) {
  try {
    await requirePermission('bookings:cancel');

    const validated = cancelBookingSchema.parse(data);

    const existingBooking = await prisma.booking.findUnique({
      where: { id: validated.id },
    });

    if (!existingBooking) {
      return { error: 'Booking not found' };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: validated.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelReason: validated.reason,
      },
    });

    await logStatusChange('booking', updatedBooking.id, existingBooking, updatedBooking);
    revalidatePath('/admin/bookings');
    revalidatePath('/admin');

    return { success: true, booking: updatedBooking };
  } catch (error) {
    console.error('Cancel booking error:', error);
    if (error instanceof z.ZodError) {
      return { error: 'Validation failed', details: error.issues };
    }
    return { error: 'Failed to cancel booking' };
  }
}

export async function deleteBooking(id: string) {
  try {
    await requirePermission('bookings:delete');

    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return { error: 'Booking not found' };
    }

    await prisma.booking.delete({
      where: { id },
    });

    await logDelete('booking', id, existingBooking);
    revalidatePath('/admin/bookings');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Delete booking error:', error);
    return { error: 'Failed to delete booking' };
  }
}

export async function confirmBooking(id: string) {
  try {
    await requirePermission('bookings:update');

    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return { error: 'Booking not found' };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });

    await logStatusChange('booking', id, existingBooking, updatedBooking);
    revalidatePath('/admin/bookings');
    revalidatePath('/admin');

    return { success: true, booking: updatedBooking };
  } catch (error) {
    console.error('Confirm booking error:', error);
    return { error: 'Failed to confirm booking' };
  }
}

export async function completeBooking(id: string) {
  try {
    await requirePermission('bookings:update');

    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return { error: 'Booking not found' };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.COMPLETED },
    });

    await logStatusChange('booking', id, existingBooking, updatedBooking);
    revalidatePath('/admin/bookings');
    revalidatePath('/admin');

    return { success: true, booking: updatedBooking };
  } catch (error) {
    console.error('Complete booking error:', error);
    return { error: 'Failed to complete booking' };
  }
}
