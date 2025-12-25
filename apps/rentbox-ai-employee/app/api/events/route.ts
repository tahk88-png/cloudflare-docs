import { NextRequest } from "next/server";
import { z } from "zod";

import { json, withCors } from "@/lib/http";
import { allowedWidgetOrigin } from "@/lib/auth";
import { getBookingByIdOrExternal } from "@/lib/repos/bookings";
import { insertEvent } from "@/lib/repos/events";
import { processEvent } from "@/lib/rules/engine";

const EventSchema = z.object({
  type: z.string().min(1),
  source: z.string().min(1).optional(),
  external_id: z.string().optional(),
  booking_id: z.string().optional(),
  payload: z.unknown().default({})
});

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = new Response(null, { status: 204 });
  return withCors(res, allowedWidgetOrigin(origin) ? origin : null);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const parsed = EventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return withCors(json({ error: "invalid_request", issues: parsed.error.issues }, 400), allowedWidgetOrigin(origin) ? origin : null);
  }

  let bookingDbId: string | null = null;
  if (parsed.data.booking_id) {
    const booking = await getBookingByIdOrExternal(parsed.data.booking_id);
    bookingDbId = booking?.id ?? null;
  }

  const ev = await insertEvent({
    type: parsed.data.type,
    source: parsed.data.source ?? "webhook",
    external_id: parsed.data.external_id ?? null,
    booking_id: bookingDbId,
    payload: parsed.data.payload
  });

  // Process immediately for v1. (Worker can also re-process later if needed.)
  await processEvent(ev.id);

  return withCors(json({ ok: true, event: { id: ev.id, processed_at: ev.processed_at } }), allowedWidgetOrigin(origin) ? origin : null);
}

