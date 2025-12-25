import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const actionType = searchParams.get('action_type');
    const bookingId = searchParams.get('booking_id');
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search');

    let query = `SELECT aa.*, u.email, u.name, b.id as booking_id
                 FROM ai_actions aa
                 LEFT JOIN users u ON aa.user_id = u.id
                 LEFT JOIN bookings b ON aa.booking_id = b.id`;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (actionType) {
      conditions.push(`aa.action_type = $${paramIndex++}`);
      params.push(actionType);
    }
    if (bookingId) {
      conditions.push(`aa.booking_id = $${paramIndex++}`);
      params.push(parseInt(bookingId, 10));
    }
    if (userId) {
      conditions.push(`aa.user_id = $${paramIndex++}`);
      params.push(parseInt(userId, 10));
    }
    if (search) {
      conditions.push(`(aa.reason ILIKE $${paramIndex} OR aa.outcome ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY aa.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return NextResponse.json({ actions: result.rows });
  } catch (error) {
    console.error('AI actions list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
