import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSms } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, payload } = body;

    // 1. Store Event
    const event = await prisma.event.create({
      data: {
        type: event_type,
        payload: payload,
        status: 'pending'
      }
    });

    if (event_type === 'locker.open_result') {
        const { correlation_id, success, error } = payload;
        
        // Find Attempt
        const attempt = await prisma.lockerOpenAttempt.findUnique({
            where: { correlationId: correlation_id },
            include: { booking: { include: { user: true } }, locker: true, compartment: true }
        });

        if (attempt) {
            // Update Attempt
            const status = success ? 'SUCCESS' : 'FAILURE';
            await prisma.lockerOpenAttempt.update({
                where: { id: attempt.id },
                data: {
                    status,
                    resultAt: new Date(),
                    errorDetails: error
                }
            });

            // Update Locker Event Booking Link
            await prisma.event.update({
                where: { id: event.id },
                data: { bookingId: attempt.bookingId, status: 'processed' }
            });

            // Handle Failure
            if (!success) {
                console.log(`[LOCKER] Open failed for ${correlation_id}`);
                
                // 1. Decrement Locker Reliability (Simple mock logic)
                await prisma.locker.update({
                    where: { id: attempt.lockerId },
                    data: { reliability: { decrement: 5 } } // Penalize
                });

                // 2. Increment Compartment Failure Count
                await prisma.compartment.update({
                    where: { id: attempt.compartmentId },
                    data: { openFailedCount: { increment: 1 } }
                });

                // 3. Create Ticket
                await prisma.ticket.create({
                    data: {
                        bookingId: attempt.bookingId,
                        userId: attempt.booking.userId,
                        status: 'OPEN',
                        priority: 'URGENT',
                        assignedTo: 'OPS',
                        description: `Locker Open Failed. Error: ${error || 'Unknown'}`
                    }
                });

                // 4. Send Support Message
                await sendSms(
                    attempt.booking.user.phone || '', 
                    "Rentbox: Vabandame! Kapi avamine ebaõnnestus. Oleme loonud automaatse tugipileti ja võtame kohe ühendust."
                );
            } else {
                // Success - Reset failure count?
                await prisma.compartment.update({
                    where: { id: attempt.compartmentId },
                    data: { openFailedCount: 0 }
                });
            }
        }
    } else if (event_type === 'locker.status') {
        // Update locker status
        const { locker_id, status } = payload;
        // Mock update
        console.log(`Locker ${locker_id} status: ${status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
