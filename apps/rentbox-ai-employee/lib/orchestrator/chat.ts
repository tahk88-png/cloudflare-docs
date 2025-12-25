import { createMessage } from "../repos/messages";
import { tool_create_ticket, tool_get_booking, tool_log_ai_action } from "../tools";
import { assertOutboundRateLimitAllowed } from "../safety";

export type AgentRole = "support" | "ops" | "sales";

function routeRoleFromText(text: string): AgentRole {
  const t = text.toLowerCase();
  if (t.includes("invoice") || t.includes("receipt") || t.includes("price") || t.includes("upgrade")) return "sales";
  if (t.includes("open") || t.includes("locker") || t.includes("compartment") || t.includes("stuck")) return "ops";
  return "support";
}

function draftReply(role: AgentRole) {
  if (role === "ops") {
    return "I can help with the locker. Please confirm you are at the locker and which compartment code you see.";
  }
  if (role === "sales") {
    return "Happy to help with pricing/billing. What plan or add-on are you interested in?";
  }
  return "Thanks — I’m here to help. Can you share what went wrong and any details from your booking confirmation?";
}

export async function orchestrateChatReply(params: { booking_id: string; inboundText: string }) {
  const booking = await tool_get_booking({ booking_id: params.booking_id }).catch(() => null);
  if (!booking) return;

  const role = routeRoleFromText(params.inboundText);
  await tool_log_ai_action({
    booking_id: booking.id,
    user_id: booking.user_id,
    action_type: "chat.route",
    reason: `Routed to ${role} based on message keywords`,
    outcome: "routed",
    metadata: { role }
  });

  if (booking.user_id) {
    await assertOutboundRateLimitAllowed(booking.user_id);
  }

  const t = params.inboundText.toLowerCase();
  if (role === "ops" && (t.includes("open failed") || t.includes("can't open") || t.includes("cannot open"))) {
    await tool_create_ticket({
      booking_id: booking.id,
      user_id: booking.user_id,
      category: "locker",
      title: "Locker open issue",
      description: `Customer reported: ${params.inboundText}`,
      metadata: { source: "chat_orchestrator_v1" }
    });
    await tool_log_ai_action({
      booking_id: booking.id,
      user_id: booking.user_id,
      action_type: "create_ticket",
      reason: "Customer reported locker open failure",
      outcome: "ticket_created",
      metadata: { category: "locker" }
    });
  }

  await createMessage({
    booking_id: booking.id,
    user_id: booking.user_id,
    direction: "outbound",
    channel: "chat",
    role,
    content: draftReply(role),
    metadata: { orchestrator: "heuristic-v1" }
  });
}

