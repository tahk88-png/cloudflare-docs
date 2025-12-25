import { Booking, Product, Role } from "@prisma/client";
import { AgentResponse } from "./types";
import prisma from "../prisma";

export async function runSalesAgent(
  booking: Booking & { product: Product },
  content: string
): Promise<AgentResponse> {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('extend')) {
    await prisma.aiAction.create({
      data: {
        bookingId: booking.id,
        type: 'log',
        agentRole: 'SALES',
        reason: 'User asked to extend',
        outcome: 'extension_offer_sent'
      }
    });
    return {
      role: 'SALES',
      response: "You can extend your booking for 5€/hour. Should I add 1 hour?"
    };
  }

  // Check product for relevant upsells
  // Mock logic
  if (booking.product.name.includes('Makita')) {
    // Only upsell if not already upsold?
    await prisma.aiAction.create({
      data: {
        bookingId: booking.id,
        type: 'log',
        agentRole: 'SALES',
        reason: 'Relevant upsell opportunity (Makita)',
        outcome: 'upsell_offered'
      }
    });

    return {
      role: 'SALES',
      response: "We have spare batteries available in Locker B (Compartment S). Would you like to add one for 3€?"
    };
  }

  return {
    role: 'SALES',
    response: "I can help you modify your booking duration."
  };
}
