import { dbQuery } from "../db";

export type AiActionRow = {
  id: string;
  created_at: string;
  booking_id: string | null;
  user_id: string | null;
  action_type: string;
  reason: string | null;
  outcome: string | null;
  status: "success" | "skipped" | "failed";
  metadata: unknown;
};

export async function logAiAction(input: {
  booking_id: string | null;
  user_id: string | null;
  action_type: string;
  reason?: string | null;
  outcome?: string | null;
  status?: AiActionRow["status"];
  metadata?: unknown;
}): Promise<AiActionRow> {
  const q = await dbQuery<AiActionRow>(
    `
    insert into ai_actions (booking_id, user_id, action_type, reason, outcome, status, metadata)
    values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    returning *
    `,
    [
      input.booking_id,
      input.user_id,
      input.action_type,
      input.reason ?? null,
      input.outcome ?? null,
      input.status ?? "success",
      JSON.stringify(input.metadata ?? {})
    ]
  );
  return q.rows[0]!;
}

export async function searchAiActions(params: {
  q?: string;
  limit?: number;
}): Promise<AiActionRow[]> {
  const limit = Math.min(params.limit ?? 200, 500);
  if (!params.q || params.q.trim().length === 0) {
    const r = await dbQuery<AiActionRow>(`select * from ai_actions order by created_at desc limit $1`, [
      limit
    ]);
    return r.rows;
  }

  const query = `%${params.q.trim()}%`;
  const r = await dbQuery<AiActionRow>(
    `
    select *
    from ai_actions
    where action_type ilike $1
       or coalesce(reason,'') ilike $1
       or coalesce(outcome,'') ilike $1
    order by created_at desc
    limit $2
    `,
    [query, limit]
  );
  return r.rows;
}

