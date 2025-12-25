import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { openLocker } from '@/lib/locker';
import { z } from 'zod';

const openLockerSchema = z.object({
  booking_id: z.number(),
  pickup_code: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, pickup_code } = openLockerSchema.parse(body);

    // Get booking details with latest payment
    const bookingResult = await db.query(
      `SELECT b.*, c.id as compartment_id, c.locker_id, c.compartment_number,
              (SELECT status FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1) as payment_status
       FROM bookings b
       JOIN compartments c ON b.compartment_id = c.id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingResult.rows[0];

    // Safety checks
    if (booking.payment_status !== 'completed') {
      return NextResponse.json({ error: 'Booking is not paid' }, { status: 403 });
    }

    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);

    if (now < startTime || now > endTime) {
      return NextResponse.json({ error: 'Outside allowed time window' }, { status: 403 });
    }

    if (pickup_code && booking.pickup_code !== pickup_code) {
      return NextResponse.json({ error: 'Invalid pickup code' }, { status: 403 });
    }

    // Compartment is already verified via JOIN

    // Open locker
    const result = await openLocker({
      lockerId: booking.locker_id,
      compartmentId: booking.compartment_id,
      bookingId: booking_id,
      pickupCode: pickup_code,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // Log action
    await db.query(
      `INSERT INTO ai_actions (action_type, booking_id, reason, outcome)
       VALUES ('locker_open', $1, 'User requested locker open', $2)`,
      [booking_id, result.message]
    );

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Locker open error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
