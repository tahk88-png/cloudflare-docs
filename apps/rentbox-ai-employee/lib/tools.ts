import { getBookingByIdOrExternal } from "./repos/bookings";
import { createTicket } from "./repos/tickets";
import { createMessage } from "./repos/messages";
import { logAiAction } from "./repos/ai-actions";
import { assertOutboundRateLimitAllowed } from "./safety";
import { sendEmail } from "./providers/email";
import { sendSms } from "./providers/sms";

export async function tool_get_booking(input: { booking_id: string }) {
  const booking = await getBookingByIdOrExternal(input.booking_id);
  if (!booking) throw new Error("booking_not_found");
  return booking;
}

export async function tool_log_ai_action(input: {
  booking_id: string | null;
  user_id: string | null;
  action_type: string;
  reason?: string | null;
  outcome?: string | null;
  status?: "success" | "skipped" | "failed";
  metadata?: unknown;
}) {
  return logAiAction(input);
}

export async function tool_create_ticket(input: {
  booking_id: string | null;
  user_id: string | null;
  category: string;
  title: string;
  description?: string;
  metadata?: unknown;
}) {
  return createTicket(input);
}

export async function tool_send_email(input: {
  booking_id: string | null;
  user_id: string | null;
  to: string;
  subject: string;
  text: string;
  role?: "support" | "ops" | "sales" | "ai" | "system";
}) {
  if (input.user_id) await assertOutboundRateLimitAllowed(input.user_id);
  const result = await sendEmail({ to: input.to, subject: input.subject, text: input.text });
  await createMessage({
    booking_id: input.booking_id!,
    user_id: input.user_id,
    direction: "outbound",
    channel: "email",
    role: input.role ?? "system",
    content: `${input.subject}\n\n${input.text}`,
    metadata: { provider: result.provider, messageId: result.messageId }
  });
  await logAiAction({
    booking_id: input.booking_id,
    user_id: input.user_id,
    action_type: "send_email",
    reason: "Requested by orchestrator",
    outcome: `sent via ${result.provider}`,
    metadata: { to: input.to, provider: result.provider, messageId: result.messageId }
  });
  return result;
}

export async function tool_send_sms(input: {
  booking_id: string | null;
  user_id: string | null;
  to: string;
  text: string;
  role?: "support" | "ops" | "sales" | "ai" | "system";
}) {
  if (input.user_id) await assertOutboundRateLimitAllowed(input.user_id);
  const result = await sendSms({ to: input.to, text: input.text });
  await createMessage({
    booking_id: input.booking_id!,
    user_id: input.user_id,
    direction: "outbound",
    channel: "sms",
    role: input.role ?? "system",
    content: input.text,
    metadata: { provider: result.provider, sid: result.sid }
  });
  await logAiAction({
    booking_id: input.booking_id,
    user_id: input.user_id,
    action_type: "send_sms",
    reason: "Requested by orchestrator",
    outcome: `sent via ${result.provider}`,
    metadata: { to: input.to, provider: result.provider, sid: result.sid }
  });
  return result;
}

