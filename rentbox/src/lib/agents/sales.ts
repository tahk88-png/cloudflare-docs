import { Booking, Product, Role } from "@prisma/client";
import { AgentResponse } from "./types";

export async function runSalesAgent(
  booking: Booking & { product: Product },
  content: string
): Promise<AgentResponse> {
  
  if (content.toLowerCase().includes('extend')) {
    return {
      role: 'SALES',
      response: "You can extend your booking for 5€/hour. Should I add 1 hour?"
    };
  }

  // Check product for relevant upsells
  // Mock logic
  if (booking.product.name.includes('Makita')) {
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
