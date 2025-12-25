import { dbQuery } from "../db";

export type TicketRow = {
  id: string;
  created_at: string;
  updated_at: string;
  booking_id: string | null;
  user_id: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  category: string;
  title: string;
  description: string | null;
  last_event_id: string | null;
  assigned_to: string | null;
  metadata: unknown;
};

export async function createTicket(input: {
  booking_id: string | null;
  user_id: string | null;
  category: string;
  title: string;
  description?: string;
  last_event_id?: string | null;
  metadata?: unknown;
}): Promise<TicketRow> {
  const q = await dbQuery<TicketRow>(
    `
    insert into tickets (booking_id, user_id, category, title, description, last_event_id, metadata)
    values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    returning *
    `,
    [
      input.booking_id,
      input.user_id,
      input.category,
      input.title,
      input.description ?? null,
      input.last_event_id ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  return q.rows[0]!;
}

export async function listTickets(params: {
  status?: TicketRow["status"];
  limit?: number;
}): Promise<TicketRow[]> {
  const limit = Math.min(params.limit ?? 100, 500);
  if (params.status) {
    const q = await dbQuery<TicketRow>(
      `select * from tickets where status = $1 order by updated_at desc limit $2`,
      [params.status, limit]
    );
    return q.rows;
  }
  const q = await dbQuery<TicketRow>(`select * from tickets order by updated_at desc limit $1`, [limit]);
  return q.rows;
}

export async function findRecentOpenTicket(params: {
  booking_id: string;
  category: string;
  withinHours: number;
}): Promise<TicketRow | null> {
  const q = await dbQuery<TicketRow>(
    `
    select *
    from tickets
    where booking_id = $1
      and category = $2
      and status in ('open', 'in_progress')
      and created_at > now() - ($3::text || ' hours')::interval
    order by created_at desc
    limit 1
    `,
    [params.booking_id, params.category, String(params.withinHours)]
  );
  return q.rows[0] ?? null;
}

