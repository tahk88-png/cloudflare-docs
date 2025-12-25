import { createMessage } from "../repos/messages";
import { getBookingContext } from "../repos/booking-context";
import { setBookingPaid } from "../repos/bookings";
import { countRecentEvents, getEventById, markEventFailed, markEventProcessed } from "../repos/events";
import { findRecentOpenTicket } from "../repos/tickets";
import { dbQuery } from "../db";
import { renderTemplate, type TemplateId } from "../templates";
import { tool_create_ticket, tool_log_ai_action, tool_send_email, tool_send_sms } from "../tools";

async function deliverTemplate(params: {
  bookingId: string;
  templateId: TemplateId;
  actionType: string;
  role: "support" | "ops" | "sales" | "system";
  reason: string;
}) {
  const ctx = await getBookingContext(params.bookingId);
  if (!ctx) throw new Error("booking_context_not_found");

  const rendered = renderTemplate(params.templateId, {
    name: ctx.user_name ?? "there",
    booking_id: ctx.booking_external_id ?? ctx.booking_id,
    locker_name: ctx.locker_name,
    locker_location: ctx.locker_location ?? "",
    compartment_code: ctx.compartment_code,
    start_at: new Date(ctx.booking_start_at).toISOString(),
    end_at: new Date(ctx.booking_end_at).toISOString()
  });

  const userId = ctx.user_id;
  if (ctx.user_email) {
    await tool_send_email({
      booking_id: ctx.booking_id,
      user_id: userId,
      to: ctx.user_email,
      subject: rendered.subject,
      text: rendered.text,
      role: params.role
    });
  } else if (ctx.user_phone) {
    await tool_send_sms({
      booking_id: ctx.booking_id,
      user_id: userId,
      to: ctx.user_phone,
      text: `${rendered.subject}\n${rendered.text}`,
      role: params.role
    });
  } else {
    // fallback: store as chat/system message so it appears in the widget thread
    await createMessage({
      booking_id: ctx.booking_id,
      user_id: userId,
      direction: "outbound",
      channel: "chat",
      role: "system",
      content: `${rendered.subject}\n\n${rendered.text}`,
      metadata: { template: params.templateId, fallback: true }
    });
  }

  await tool_log_ai_action({
    booking_id: ctx.booking_id,
    user_id: userId,
    action_type: params.actionType,
    reason: params.reason,
    outcome: "delivered",
    metadata: { templateId: params.templateId }
  });
}

export async function processEvent(eventId: string) {
  const ev = await getEventById(eventId);
  if (!ev) return;

  try {
    if (ev.type === "payment.paid" && ev.booking_id) {
      await setBookingPaid(ev.booking_id, true);
      await tool_log_ai_action({
        booking_id: ev.booking_id,
        user_id: null,
        action_type: "event.payment.paid",
        reason: "Payment webhook marked booking as paid",
        outcome: "booking_paid=true",
        metadata: { event_id: ev.id }
      });
    }

    if ((ev.type === "booking.created" || ev.type === "booking.confirmed") && ev.booking_id) {
      await deliverTemplate({
        bookingId: ev.booking_id,
        templateId: "pickup_instructions",
        actionType: "event.pickup_instructions",
        role: "support",
        reason: `Triggered by ${ev.type}`
      });
    }

    if (ev.type === "payment.pending" && ev.booking_id) {
      await deliverTemplate({
        bookingId: ev.booking_id,
        templateId: "payment_pending",
        actionType: "event.payment_pending",
        role: "sales",
        reason: "Payment pending webhook"
      });
    }

    if (ev.type === "locker.open_failed" && ev.booking_id) {
      const recent = await findRecentOpenTicket({ booking_id: ev.booking_id, category: "locker", withinHours: 24 });
      if (!recent) {
        await tool_create_ticket({
          booking_id: ev.booking_id,
          user_id: null,
          category: "locker",
          title: "Locker open_failed",
          description: "Received locker.open_failed event.",
          metadata: { event_id: ev.id, source: ev.source }
        });
        await tool_log_ai_action({
          booking_id: ev.booking_id,
          user_id: null,
          action_type: "event.open_failed.ticket",
          reason: "Created ticket for locker open_failed",
          outcome: "ticket_created",
          metadata: { event_id: ev.id }
        });
      }

      const occurrences = await countRecentEvents({ booking_id: ev.booking_id, type: "locker.open_failed", withinHours: 24 });
      if (occurrences >= 2) {
        await deliverTemplate({
          bookingId: ev.booking_id,
          templateId: "pickup_instructions",
          actionType: "event.open_failed.help",
          role: "ops",
          reason: "Repeated locker open failures"
        });
      }
    }

    await markEventProcessed(ev.id);
  } catch (e: any) {
    await markEventFailed(ev.id, String(e?.message ?? e));
    await tool_log_ai_action({
      booking_id: ev.booking_id,
      user_id: null,
      action_type: "event.processing_failed",
      reason: `Failed to process ${ev.type}`,
      outcome: String(e?.message ?? e),
      status: "failed",
      metadata: { event_id: ev.id }
    });
  }
}

export async function runScheduledRules() {
  // Reminder: booking ends within next hour
  const soon = await dbQuery<{ id: string }>(
    `
    select id
    from bookings
    where status = 'active'
      and end_at between now() and now() + interval '1 hour'
    `
  );
  for (const b of soon.rows) {
    const already = await dbQuery<{ c: number }>(
      `
      select count(*)::int as c
      from ai_actions
      where booking_id = $1
        and action_type = 'scheduled.reminder_before_end'
        and created_at > now() - interval '6 hours'
      `,
      [b.id]
    );
    if ((already.rows[0]?.c ?? 0) > 0) continue;
    await deliverTemplate({
      bookingId: b.id,
      templateId: "reminder_before_end",
      actionType: "scheduled.reminder_before_end",
      role: "support",
      reason: "Booking end is within 1 hour"
    });
  }

  // Overdue notices (once per 24h)
  const overdue = await dbQuery<{ id: string }>(
    `
    select id
    from bookings
    where status = 'active'
      and end_at < now()
    `
  );
  for (const b of overdue.rows) {
    const already = await dbQuery<{ c: number }>(
      `
      select count(*)::int as c
      from ai_actions
      where booking_id = $1
        and action_type = 'scheduled.overdue_notice'
        and created_at > now() - interval '24 hours'
      `,
      [b.id]
    );
    if ((already.rows[0]?.c ?? 0) > 0) continue;
    await deliverTemplate({
      bookingId: b.id,
      templateId: "overdue_notice",
      actionType: "scheduled.overdue_notice",
      role: "support",
      reason: "Booking is overdue"
    });
  }
}

