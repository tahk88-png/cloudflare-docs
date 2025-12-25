import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = `SELECT t.*, u.email, u.name, b.id as booking_id
                 FROM tickets t
                 JOIN users u ON t.user_id = u.id
                 LEFT JOIN bookings b ON t.booking_id = b.id`;
    const params: any[] = [];

    if (status) {
      query += ` WHERE t.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return NextResponse.json({ tickets: result.rows });
  } catch (error) {
    console.error('Tickets list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const validated = updateTicketSchema.parse(updates);

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (validated.status) {
      fields.push(`status = $${paramIndex++}`);
      params.push(validated.status);
    }
    if (validated.priority) {
      fields.push(`priority = $${paramIndex++}`);
      params.push(validated.priority);
    }
    if (validated.assigned_to !== undefined) {
      fields.push(`assigned_to = $${paramIndex++}`);
      params.push(validated.assigned_to);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, params);

    return NextResponse.json({ ticket: result.rows[0] });
  } catch (error) {
    console.error('Ticket update error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
