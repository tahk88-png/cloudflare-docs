import { Booking, User, Role } from "@prisma/client";
import { AgentResponse } from "./types";
import prisma from "../prisma";

export async function runSupportAgent(
  booking: Booking & { user: User },
  content: string
): Promise<AgentResponse> {
  // Simple heuristic response
  // Ideally this calls an LLM with the FAQ context

  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('broken') || lowerContent.includes('damage') || lowerContent.includes('issue')) {
    // Create Ticket
    await prisma.ticket.create({
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        description: content,
        priority: 'HIGH',
        assignedTo: 'SUPPORT',
        status: 'OPEN'
      }
    });

    await prisma.aiAction.create({
      data: {
        bookingId: booking.id,
        type: 'ticket',
        agentRole: 'SUPPORT',
        reason: 'User reported damage/issue',
        outcome: 'ticket_created'
      }
    });

    return {
      role: 'SUPPORT',
      response: "I'm sorry to hear that. I've created a priority support ticket. A human agent will call you shortly."
    };
  }

  return {
    role: 'SUPPORT',
    response: "I am Rentbox Support. I can help with issues or questions about your rental. For urgent access issues, I'll transfer you to Ops."
  };
}
