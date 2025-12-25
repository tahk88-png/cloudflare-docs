import { NextRequest } from "next/server";
import { z } from "zod";

import { allowedWidgetOrigin } from "@/lib/auth";
import { json, withCors } from "@/lib/http";
import { getBookingByIdOrExternal } from "@/lib/repos/bookings";
import { createMessage, listMessagesForBooking } from "@/lib/repos/messages";
import { orchestrateChatReply } from "@/lib/orchestrator/chat";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = new Response(null, { status: 204 });
  return withCors(res, allowedWidgetOrigin(origin) ? origin : null);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const bookingId = req.nextUrl.searchParams.get("booking_id") ?? "";
  const booking = await getBookingByIdOrExternal(bookingId);
  if (!booking) {
    return withCors(json({ error: "booking_not_found" }, 404), allowedWidgetOrigin(origin) ? origin : null);
  }

  const messages = await listMessagesForBooking(booking.id);
  return withCors(json({ booking_id: booking.external_id ?? booking.id, messages }), allowedWidgetOrigin(origin) ? origin : null);
}

const PostSchema = z.object({
  booking_id: z.string().min(1),
  content: z.string().min(1).max(4000)
});

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return withCors(json({ error: "invalid_request", issues: parsed.error.issues }, 400), allowedWidgetOrigin(origin) ? origin : null);
  }

  const booking = await getBookingByIdOrExternal(parsed.data.booking_id);
  if (!booking) {
    return withCors(json({ error: "booking_not_found" }, 404), allowedWidgetOrigin(origin) ? origin : null);
  }

  const inbound = await createMessage({
    booking_id: booking.id,
    user_id: booking.user_id,
    direction: "inbound",
    channel: "chat",
    role: "customer",
    content: parsed.data.content,
    metadata: { source: "widget" }
  });

  // Fire-and-forget style orchestration (we await to return a consistent response in v1)
  await orchestrateChatReply({ booking_id: booking.id, inboundText: inbound.content });

  const messages = await listMessagesForBooking(booking.id);
  return withCors(json({ ok: true, messages }), allowedWidgetOrigin(origin) ? origin : null);
}

