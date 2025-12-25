import { db } from '../../db';

export interface CreateTicketParams {
  userId: number;
  bookingId: number | null;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export async function createTicket(params: CreateTicketParams): Promise<{ id: number }> {
  const result = await db.query(
    `INSERT INTO tickets (user_id, booking_id, title, description, priority, status)
     VALUES ($1, $2, $3, $4, $5, 'open')
     RETURNING id`,
    [params.userId, params.bookingId, params.title, params.description, params.priority || 'medium']
  );

  return { id: result.rows[0].id };
}
