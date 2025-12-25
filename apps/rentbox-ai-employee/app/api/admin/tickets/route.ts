import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { json } from "@/lib/http";
import { listTickets } from "@/lib/repos/tickets";

const QuerySchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional()
});

export async function GET(req: NextRequest) {
  await requireAdmin();
  const parsed = QuerySchema.safeParse({
    status: req.nextUrl.searchParams.get("status") ?? undefined
  });
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const tickets = await listTickets({ status: parsed.data.status });
  return json({ ok: true, tickets });
}

