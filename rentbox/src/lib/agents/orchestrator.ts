import prisma from '../prisma';
import { AgentResponse } from './types';
import { runSupportAgent } from './support';
import { runOpsAgent } from './ops';
import { runSalesAgent } from './sales';

export async function orchestrateAgent(bookingId: string, content: string): Promise<AgentResponse> {
  // 1. Log incoming
  await prisma.message.create({
    data: {
      bookingId,
      sender: 'USER',
      content
    }
  });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, product: true, compartment: { include: { locker: true } } }
  });

  if (!booking) {
    return {
       role: 'SUPPORT',
       response: "I cannot find your booking. Please verify your link."
    };
  }

  const lowerContent = content.toLowerCase();

  // 2. Intent Routing (Simple Heuristic for V2)
  // In a real V2, this would be an LLM call "ClassifyIntent".
  
  // OPS INTENTS: unlock, open, door, problem, stuck, access, code, return
  if (
    lowerContent.includes('open') || 
    lowerContent.includes('unlock') || 
    lowerContent.includes('door') ||
    lowerContent.includes('stuck') ||
    lowerContent.includes('return')
  ) {
    return await runOpsAgent(booking, content);
  }

  // SALES INTENTS: extend, buy, price, upgrade, add
  if (
    lowerContent.includes('extend') ||
    lowerContent.includes('buy') ||
    lowerContent.includes('add')
  ) {
    return await runSalesAgent(booking, content);
  }

  // DEFAULT: SUPPORT
  return await runSupportAgent(booking, content);
}
