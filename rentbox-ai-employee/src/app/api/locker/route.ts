import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { openLocker, checkLockerOpenSafety, getLockerStatus, verifyAccessCode } from '@/lib/providers/locker';

// Schema for locker open request
const openLockerSchema = z.object({
  bookingId: z.string().uuid(),
  accessCode: z.string().min(1),
  reason: z.string().default('Customer requested access'),
});

// POST /api/locker/open - Open a locker compartment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = openLockerSchema.parse(body);

    // Verify access code first
    const codeValid = await verifyAccessCode(validated.bookingId, validated.accessCode);
    if (!codeValid) {
      return NextResponse.json(
        { error: 'Invalid or expired access code' },
        { status: 403 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: validated.bookingId },
      select: { compartmentId: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Run safety checks
    const safetyCheck = await checkLockerOpenSafety(validated.bookingId, booking.compartmentId);
    if (!safetyCheck.allowed) {
      return NextResponse.json(
        { error: safetyCheck.reason },
        { status: 403 }
      );
    }

    // Open the locker
    const result = await openLocker(validated.bookingId, validated.reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Locker opened successfully',
      openedAt: result.timestamp,
    });
  } catch (error) {
    console.error('Locker open error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/locker - Get locker status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lockerId = searchParams.get('lockerId');
    const location = searchParams.get('location');

    if (lockerId) {
      // Get specific locker status
      const status = await getLockerStatus(lockerId);
      
      if (!status) {
        return NextResponse.json(
          { error: 'Locker not found' },
          { status: 404 }
        );
      }

      const locker = await prisma.locker.findUnique({
        where: { id: lockerId },
        select: {
          id: true,
          name: true,
          location: true,
          address: true,
        },
      });

      return NextResponse.json({
        locker,
        status,
      });
    }

    // List lockers (optionally filtered by location)
    const where: any = { isActive: true };
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    const lockers = await prisma.locker.findMany({
      where,
      select: {
        id: true,
        name: true,
        location: true,
        address: true,
        latitude: true,
        longitude: true,
        _count: {
          select: {
            compartments: {
              where: { isAvailable: true, isOperational: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      lockers: lockers.map(l => ({
        ...l,
        availableCompartments: l._count.compartments,
      })),
    });
  } catch (error) {
    console.error('Locker GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
