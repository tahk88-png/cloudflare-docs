import { dbQuery } from "../db";

export type EventRow = {
  id: string;
  created_at: string;
  type: string;
  source: string;
  external_id: string | null;
  booking_id: string | null;
  payload: unknown;
  processed_at: string | null;
  processing_error: string | null;
};

export async function insertEvent(input: {
  type: string;
  source?: string;
  external_id?: string | null;
  booking_id?: string | null;
  payload: unknown;
}): Promise<EventRow> {
  const q = await dbQuery<EventRow>(
    `
    insert into events (type, source, external_id, booking_id, payload)
    values ($1, $2, $3, $4, $5::jsonb)
    returning *
    `,
    [input.type, input.source ?? "webhook", input.external_id ?? null, input.booking_id ?? null, JSON.stringify(input.payload)]
  );
  return q.rows[0]!;
}

export async function getEventById(eventId: string): Promise<EventRow | null> {
  const q = await dbQuery<EventRow>(`select * from events where id = $1 limit 1`, [eventId]);
  return q.rows[0] ?? null;
}

export async function markEventProcessed(eventId: string) {
  await dbQuery(`update events set processed_at = now(), processing_error = null where id = $1`, [eventId]);
}

export async function markEventFailed(eventId: string, err: string) {
  await dbQuery(`update events set processed_at = now(), processing_error = $2 where id = $1`, [eventId, err]);
}

export async function countRecentEvents(params: {
  booking_id: string;
  type: string;
  withinHours: number;
}): Promise<number> {
  const q = await dbQuery<{ c: number }>(
    `
    select count(*)::int as c
    from events
    where booking_id = $1
      and type = $2
      and created_at > now() - ($3::text || ' hours')::interval
    `,
    [params.booking_id, params.type, String(params.withinHours)]
  );
  return q.rows[0]?.c ?? 0;
}

