import { NextRequest, NextResponse } from 'next/server';
import { EventRepository } from '@/lib/repositories/events';
import { z } from 'zod';

const eventSchema = z.object({
  event_type: z.string(),
  entity_type: z.string().optional(),
  entity_id: z.number().optional(),
  payload: z.any()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = eventSchema.parse(body);

    // Create event in database
    const event = await EventRepository.create({
      event_type: validated.event_type,
      entity_type: validated.entity_type,
      entity_id: validated.entity_id,
      payload: validated.payload
    });

    // Events will be processed by the background worker
    console.log('Event received:', event.id, event.event_type);

    return NextResponse.json({
      success: true,
      event_id: event.id
    });
  } catch (error: any) {
    console.error('Webhook error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid event data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
