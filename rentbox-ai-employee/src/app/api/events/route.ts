import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { EventType } from '@prisma/client';

// Schema for incoming events
const eventSchema = z.object({
  type: z.nativeEnum(EventType),
  source: z.string().default('webhook'),
  bookingId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

// POST /api/events - Receive webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = eventSchema.parse(body);

    // Create the event
    const event = await prisma.event.create({
      data: {
        type: validated.type,
        source: validated.source,
        bookingId: validated.bookingId,
        paymentId: validated.paymentId,
        payload: validated.payload as any,
        processed: false,
      },
    });

    // Trigger immediate processing for certain event types
    const immediateProcessingTypes: EventType[] = [
      EventType.PAYMENT_COMPLETED,
      EventType.LOCKER_OPEN_FAILED,
      EventType.BOOKING_OVERDUE,
    ];

    if (immediateProcessingTypes.includes(validated.type)) {
      // Import and call rules engine
      const { processEvent } = await import('@/lib/rules/engine');
      await processEvent(event.id);
    }

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: 'Event received and queued for processing',
    });
  } catch (error) {
    console.error('Events API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/events - List events (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const bookingId = searchParams.get('bookingId');
    const processed = searchParams.get('processed');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (type) where.type = type;
    if (bookingId) where.bookingId = bookingId;
    if (processed !== null) where.processed = processed === 'true';

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          source: true,
          bookingId: true,
          paymentId: true,
          processed: true,
          processedAt: true,
          error: true,
          createdAt: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Events API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
