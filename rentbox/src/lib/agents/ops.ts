import { Booking, Compartment, Locker, User, Role } from "@prisma/client";
import { AgentResponse } from "./types";
import prisma from "../prisma";
import { openLocker } from "../locker-api"; 

export async function runOpsAgent(
  booking: Booking & { compartment: Compartment & { locker: Locker }; user: User },
  content: string
): Promise<AgentResponse> {
  const lowerContent = content.toLowerCase();

  // COMMAND: OPEN LOCKER
  if (lowerContent.includes('open') || lowerContent.includes('unlock')) {
    // Rule Check 1: Payment
    if (booking.status === 'PENDING_PAYMENT' || booking.status === 'DRAFT') {
      return {
        role: 'OPS',
        response: "I cannot open the locker yet. Please complete payment first."
      };
    }

    // Rule Check 2: Time Window (Start time - 15 mins)
    const now = new Date();
    const allowedStart = new Date(booking.startTime.getTime() - 15 * 60000);
    
    // Allow if IN_USE or READY_FOR_PICKUP or (PAID and within time)
    if (now < allowedStart) {
       return {
         role: 'OPS',
         response: `It is too early. Your booking starts at ${booking.startTime.toLocaleTimeString()}. You can access 15 minutes prior.`
       };
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      return {
        role: 'OPS',
        response: "This booking is no longer active."
      };
    }

    // Execute Open
    try {
      // Use nested locker from compartment
      const locker = booking.compartment.locker;
      await openLocker(locker.id, booking.compartment.id);
      
      // Update State if needed
      if (booking.status === 'PAID' || booking.status === 'READY_FOR_PICKUP') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'PICKED_UP' } 
        });
      }

      await prisma.aiAction.create({
        data: {
          bookingId: booking.id,
          type: 'tool_call',
          agentRole: 'OPS',
          reason: 'User requested unlock',
          outcome: 'success',
          toolCalls: { tool: 'openLocker', lockerId: locker.id }
        }
      });

      return {
        role: 'OPS',
        response: `Locker ${locker.location} / Door ${booking.compartment.size} opened.`,
        actionTaken: 'opened_locker'
      };

    } catch (e) {
      // Log failure
       await prisma.aiAction.create({
        data: {
          bookingId: booking.id,
          type: 'tool_call',
          agentRole: 'OPS',
          reason: 'User requested unlock',
          outcome: 'failed',
          toolCalls: { error: String(e) }
        }
      });

      return {
        role: 'OPS',
        response: "I tried to open the locker but it failed. I have notified support."
      };
    }
  }

  // COMMAND: RETURN
  if (lowerContent.includes('return')) {
     return {
       role: 'OPS',
       response: "To return, please place the item back in the locker, close the door, and click 'End Booking' in your link. Or simply say 'I have returned it'."
     };
  }

  return {
    role: 'OPS',
    response: "I can help you with opening the locker or returning the item."
  };
}
