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
    
    try {
      // Use nested locker from compartment
      const locker = booking.compartment.locker;
      // Pass bookingId for policy check
      await openLocker(locker.id, booking.compartment.id, booking.id);
      
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

    } catch (e: any) {
      // Log failure
       await prisma.aiAction.create({
        data: {
          bookingId: booking.id,
          type: 'tool_call',
          agentRole: 'OPS',
          reason: 'User requested unlock',
          outcome: 'failed',
          toolCalls: { error: e.message }
        }
      });

      return {
        role: 'OPS',
        response: `I cannot open the locker: ${e.message}. If this is an error, please ask for Support.`
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
