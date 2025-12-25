import prisma from './prisma';
import { sendEmail, sendSms } from './notifications';
import { openLocker } from './locker-api';

// Mock AI Orchestrator
export async function processUserMessage(bookingId: string, content: string) {
  // 1. Save user message
  await prisma.message.create({
    data: {
      bookingId,
      sender: 'USER',
      content,
    },
  });

  // 2. Analyze intent (Mock)
  let responseContent = "I'm checking that for you.";
  let role: 'SUPPORT' | 'OPS' | 'SALES' = 'SUPPORT';
  let actionTaken = null;

  const lowerContent = content.toLowerCase();

  // Retrieve booking context
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, compartment: true, locker: true },
  });

  if (!booking) {
    return { response: "I can't find your booking details.", role: 'SUPPORT' };
  }

  // INTENT MATCHING
  if (lowerContent.includes('open') || lowerContent.includes('unlock')) {
    role = 'OPS';
    // Check constraints
    if (booking.status === 'PAID' || booking.status === 'ACTIVE') {
      await openLocker(booking.locker.id, booking.compartment.id);
      responseContent = "I've opened compartment " + booking.compartment.size + " for you.";
      actionTaken = 'opened_locker';
    } else {
      responseContent = "I cannot open the locker. Please ensure your booking is paid and active.";
    }
  } else if (lowerContent.includes('extend') || lowerContent.includes('time')) {
    role = 'SALES';
    responseContent = "You can extend your booking for $5/hour. Shall I proceed?";
  } else if (lowerContent.includes('help') || lowerContent.includes('issue')) {
    role = 'SUPPORT';
    // Create ticket
    await prisma.ticket.create({
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        description: `User reported issue: ${content}`,
        priority: 'HIGH',
        assignedTo: 'SUPPORT',
      },
    });
    responseContent = "I've created a support ticket for you. An agent will contact you shortly.";
    actionTaken = 'created_ticket';
  } else {
    responseContent = "I understand. Is there anything else I can help with regarding your rental?";
  }

  // 3. Save AI response
  await prisma.message.create({
    data: {
      bookingId,
      sender: 'AI',
      content: responseContent,
      role,
    },
  });

  // 4. Log AI Action if any
  if (actionTaken) {
    await prisma.aiAction.create({
      data: {
        type: 'chat_tool',
        reason: `User asked: ${content}`,
        outcome: actionTaken,
      },
    });
  }

  return { response: responseContent, role };
}
