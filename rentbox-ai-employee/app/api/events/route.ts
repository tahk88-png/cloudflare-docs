import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processEvent } from '@/lib/automation/rules-engine';
import { z } from 'zod';

const eventSchema = z.object({
  event_type: z.string(),
  event_data: z.record(z.any()),
  booking_id: z.number().optional(),
  user_id: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, event_data, booking_id, user_id } = eventSchema.parse(body);

    // Store event
    const result = await db.query(
      `INSERT INTO events (event_type, event_data, booking_id, user_id, processed)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id`,
      [event_type, JSON.stringify(event_data), booking_id || null, user_id || null]
    );

    const eventId = result.rows[0].id;

    // Process event asynchronously
    processEvent(eventId).catch((error) => {
      console.error('Error processing event:', error);
    });

    return NextResponse.json({ id: eventId, message: 'Event received' });
  } catch (error) {
    console.error('Events API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const processed = searchParams.get('processed');

    let query = `SELECT * FROM events`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (processed !== null) {
      conditions.push(`processed = $${params.length + 1}`);
      params.push(processed === 'true');
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return NextResponse.json({ events: result.rows });
  } catch (error) {
    console.error('Events list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
