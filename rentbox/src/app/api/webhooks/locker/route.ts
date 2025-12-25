import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSms } from '@/lib/notifications';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-gateway-signature');

    // 1. Signature Verification
    if (process.env.RENTBOX_HMAC_SECRET && signature) {
        const expected = crypto
            .createHmac('sha256', process.env.RENTBOX_HMAC_SECRET)
            .update(rawBody)
            .digest('hex');
        
        // Use timingSafeEqual to prevent timing attacks
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expected);

        if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
            console.error("Invalid Signature");
            return NextResponse.json({ accepted: false }, { status: 401 });
        }
    }

    const body = JSON.parse(rawBody);
    const { event_type, data } = body; // Gateway sends 'data', not 'payload'

    // 2. Store Event
    const event = await prisma.event.create({
      data: {
        type: event_type,
        payload: data || {}, // Gateway uses 'data'
        status: 'pending'
      }
    });

    if (event_type === 'locker.open_result') {
        // Gateway payload: { result: "success"|"fail", error_code, message, correlation_id }
        const { correlation_id, result, error_code, message } = data;
        const success = (result === 'success');
        
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
                    errorCode: error_code,
                    errorDetails: message
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
                
                // 1. Decrement Locker Reliability
                await prisma.locker.update({
                    where: { id: attempt.lockerId },
                    data: { reliability: { decrement: 5 } }
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
                        description: `Locker Open Failed. Code: ${error_code}. Message: ${message}`
                    }
                });

                // 4. Send Support Message
                await sendSms(
                    attempt.booking.user.phone || '', 
                    "Rentbox: Vabandame! Kapi avamine ebaõnnestus. Oleme loonud automaatse tugipileti ja võtame kohe ühendust."
                );
            } else {
                // Success - Reset failure count
                await prisma.compartment.update({
                    where: { id: attempt.compartmentId },
                    data: { openFailedCount: 0 }
                });
            }
        }
    } else if (event_type === 'locker.status') {
        // Update locker status (Gateway sends online status)
        const { locker_id, online } = data;
        // Mock update logic
        console.log(`Locker ${locker_id} online: ${online}`);
    }

    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ accepted: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
