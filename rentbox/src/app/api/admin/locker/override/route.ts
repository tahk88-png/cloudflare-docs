import { NextRequest, NextResponse } from 'next/server';
import { openLocker } from '@/lib/locker-api';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { bookingId } = await req.json();

        const booking = await prisma.booking.findUnique({
             where: { id: bookingId },
             include: { compartment: true }
        });

        if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

        // Override Open
        const result = await openLocker(
            booking.compartment.lockerId,
            booking.compartment.id,
            booking.id,
            true // isOverride
        );

        // Log Admin Action
        await prisma.aiAction.create({
            data: {
                bookingId,
                type: 'log',
                agentRole: 'ADMIN',
                reason: 'Manual override open triggered',
                outcome: 'success',
                toolCalls: { result }
            }
        });

        return NextResponse.json({ success: true, result });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
