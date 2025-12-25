import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications';

// Mock Event Engine
async function processEvent(event: any) {
  const { type, payload, bookingId } = event;

  if (type === 'payment.success') {
    // Send pickup instructions
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
         where: { id: bookingId },
         include: { user: true, compartment: { include: { locker: true } } }
      });
      
      if (booking) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'PAID', paymentStatus: 'SUCCESS' }
        });

        await sendEmail(
          booking.user.email, 
          'Pickup Instructions', 
          `Your locker is ${booking.compartment.locker.location}. Compartment: ${booking.compartment.size}.`
        );
      }
    }
  } else if (type === 'locker.opened') {
    // Log it
    console.log('Locker opened:', payload);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload, bookingId } = body;

    // 1. Store Event
    const event = await prisma.event.create({
      data: {
        type,
        payload: payload || {},
        bookingId,
        status: 'pending'
      }
    });

    // 2. Process Event (could be async/queued)
    await processEvent({ ...event, payload });

    // 3. Update status
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'processed' }
    });

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('Event error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
