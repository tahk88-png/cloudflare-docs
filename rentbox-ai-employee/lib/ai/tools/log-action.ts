import { db } from '../../db';

export interface LogAIActionParams {
  actionType: string;
  userId: number | null;
  bookingId: number | null;
  ticketId?: number | null;
  reason: string;
  outcome?: string;
  metadata?: Record<string, any>;
}

export async function logAIAction(params: LogAIActionParams): Promise<{ id: number }> {
  const result = await db.query(
    `INSERT INTO ai_actions (action_type, user_id, booking_id, ticket_id, reason, outcome, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      params.actionType,
      params.userId,
      params.bookingId,
      params.ticketId || null,
      params.reason,
      params.outcome || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ]
  );

  return { id: result.rows[0].id };
}
