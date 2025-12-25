import { dbQuery } from "../db";

export type MessageRow = {
  id: string;
  created_at: string;
  booking_id: string;
  user_id: string | null;
  direction: "inbound" | "outbound";
  channel: "chat" | "email" | "sms" | "system";
  role: "customer" | "support" | "ops" | "sales" | "ai" | "system";
  content: string;
  metadata: unknown;
};

export async function listMessagesForBooking(bookingId: string, limit = 100): Promise<MessageRow[]> {
  const q = await dbQuery<MessageRow>(
    `select * from messages where booking_id = $1 order by created_at asc limit $2`,
    [bookingId, limit]
  );
  return q.rows;
}

export async function createMessage(input: {
  booking_id: string;
  user_id: string | null;
  direction: MessageRow["direction"];
  channel: MessageRow["channel"];
  role: MessageRow["role"];
  content: string;
  metadata?: unknown;
}): Promise<MessageRow> {
  const q = await dbQuery<MessageRow>(
    `
    insert into messages (booking_id, user_id, direction, channel, role, content, metadata)
    values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    returning *
    `,
    [
      input.booking_id,
      input.user_id,
      input.direction,
      input.channel,
      input.role,
      input.content,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  return q.rows[0]!;
}

export async function countOutboundMessagesForUserInLastHour(userId: string): Promise<number> {
  const q = await dbQuery<{ c: number }>(
    `
    select count(*)::int as c
    from messages
    where user_id = $1
      and direction = 'outbound'
      and created_at > now() - interval '1 hour'
    `,
    [userId]
  );
  return q.rows[0]?.c ?? 0;
}

