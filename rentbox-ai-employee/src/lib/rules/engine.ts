import { prisma } from '@/lib/db';
import { EventType, RuleTriggerType, BookingStatus, AiActionOutcome, TicketPriority, TicketCategory } from '@prisma/client';
import { sendTemplatedEmail, renderTemplate } from '@/lib/providers/email';
import { sendTemplatedSms, checkSmsRateLimit, incrementMessageCount } from '@/lib/providers/sms';
import { differenceInHours, differenceInDays, isPast, addHours } from 'date-fns';

// Rule action types
interface RuleAction {
  type: string;
  template?: string;
  status?: string;
  eventType?: string;
  category?: string;
  priority?: string;
  message?: string;
}

// Process a single event
export async function processEvent(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      booking: {
        include: {
          user: true,
          product: true,
          compartment: {
            include: { locker: true },
          },
        },
      },
      payment: true,
    },
  });

  if (!event) {
    console.error(`Event ${eventId} not found`);
    return;
  }

  if (event.processed) {
    console.log(`Event ${eventId} already processed`);
    return;
  }

  try {
    // Find matching rules
    const rules = await prisma.rule.findMany({
      where: {
        isActive: true,
        triggerType: RuleTriggerType.EVENT,
        triggerEvent: event.type,
      },
      orderBy: { priority: 'desc' },
      include: { template: true },
    });

    console.log(`Processing event ${eventId} (${event.type}), found ${rules.length} matching rules`);

    for (const rule of rules) {
      // Check conditions if any
      if (rule.conditions) {
        const conditionsMet = await evaluateConditions(
          rule.conditions as Record<string, unknown>,
          event
        );
        if (!conditionsMet) {
          console.log(`Rule ${rule.id} conditions not met, skipping`);
          continue;
        }
      }

      // Execute actions
      const actions = rule.actions as unknown as RuleAction[];
      for (const action of actions) {
        await executeAction(action, event, rule.id);
      }
    }

    // Mark event as processed
    await prisma.event.update({
      where: { id: eventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error processing event ${eventId}:`, error);
    await prisma.event.update({
      where: { id: eventId },
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// Evaluate rule conditions
async function evaluateConditions(
  conditions: Record<string, unknown>,
  event: any
): Promise<boolean> {
  for (const [key, value] of Object.entries(conditions)) {
    if (key.startsWith('booking.')) {
      const bookingField = key.replace('booking.', '');
      if (!event.booking) return false;
      
      const fieldValue = (event.booking as any)[bookingField];
      
      if (typeof value === 'object' && value !== null) {
        // Handle comparison operators
        const ops = value as Record<string, unknown>;
        if (ops.eq !== undefined && fieldValue !== ops.eq) return false;
        if (ops.neq !== undefined && fieldValue === ops.neq) return false;
        if (ops.gt !== undefined && !(fieldValue > (ops.gt as number))) return false;
        if (ops.gte !== undefined && !(fieldValue >= (ops.gte as number))) return false;
        if (ops.lt !== undefined) {
          if (ops.lt === 'now' && !isPast(new Date(fieldValue))) return false;
          else if (typeof ops.lt === 'number' && !(fieldValue < ops.lt)) return false;
        }
        if (ops.lte !== undefined && !(fieldValue <= (ops.lte as number))) return false;
      } else if (fieldValue !== value) {
        return false;
      }
    }

    if (key === 'hoursUntilEnd' && event.booking) {
      const hoursUntil = differenceInHours(new Date(event.booking.endDate), new Date());
      const ops = value as Record<string, number>;
      if (ops.lte !== undefined && hoursUntil > ops.lte) return false;
      if (ops.gte !== undefined && hoursUntil < ops.gte) return false;
    }

    if (key === 'daysOverdue' && event.booking) {
      const daysOver = differenceInDays(new Date(), new Date(event.booking.endDate));
      const ops = value as Record<string, number>;
      if (ops.eq !== undefined && daysOver !== ops.eq) return false;
      if (ops.gte !== undefined && daysOver < ops.gte) return false;
    }
  }

  return true;
}

// Execute a rule action
async function executeAction(
  action: RuleAction,
  event: any,
  ruleId: string
): Promise<void> {
  const triggeredBy = `rule:${ruleId}`;

  switch (action.type) {
    case 'send_email': {
      if (!action.template || !event.booking?.user?.email) break;
      
      const templateData = buildTemplateData(event);
      const result = await sendTemplatedEmail(
        action.template,
        event.booking.user.email,
        templateData
      );

      await prisma.aiAction.create({
        data: {
          action: 'send_email',
          reason: `Rule triggered email '${action.template}'`,
          outcome: result.success ? AiActionOutcome.SUCCESS : AiActionOutcome.FAILED,
          bookingId: event.bookingId,
          eventId: event.id,
          input: { template: action.template, to: event.booking.user.email },
          output: result.success ? { messageId: result.messageId } : undefined,
          error: result.error,
          triggeredBy,
        },
      });
      break;
    }

    case 'send_sms': {
      if (!action.template || !event.booking?.user?.phone) break;

      // Check rate limit
      const canSend = await checkSmsRateLimit(event.booking.userId);
      if (!canSend) {
        await prisma.aiAction.create({
          data: {
            action: 'send_sms',
            reason: `Rate limited: Rule attempted SMS '${action.template}'`,
            outcome: AiActionOutcome.SKIPPED,
            bookingId: event.bookingId,
            eventId: event.id,
            error: 'Rate limit exceeded',
            triggeredBy,
          },
        });
        break;
      }

      const templateData = buildTemplateData(event);
      const result = await sendTemplatedSms(
        action.template,
        event.booking.user.phone,
        templateData
      );

      if (result.success) {
        await incrementMessageCount(event.booking.userId);
      }

      await prisma.aiAction.create({
        data: {
          action: 'send_sms',
          reason: `Rule triggered SMS '${action.template}'`,
          outcome: result.success ? AiActionOutcome.SUCCESS : AiActionOutcome.FAILED,
          bookingId: event.bookingId,
          eventId: event.id,
          input: { template: action.template, to: event.booking.user.phone },
          output: result.success ? { messageId: result.messageId } : undefined,
          error: result.error,
          triggeredBy,
        },
      });
      break;
    }

    case 'create_ticket': {
      const ticket = await prisma.ticket.create({
        data: {
          title: buildTicketTitle(event, action),
          description: buildTicketDescription(event, action),
          category: (action.category as TicketCategory) || TicketCategory.GENERAL,
          priority: (action.priority as TicketPriority) || TicketPriority.MEDIUM,
          bookingId: event.bookingId,
          createdById: event.booking?.userId || 'system',
        },
      });

      await prisma.aiAction.create({
        data: {
          action: 'create_ticket',
          reason: `Rule created ticket for ${event.type}`,
          outcome: AiActionOutcome.SUCCESS,
          bookingId: event.bookingId,
          eventId: event.id,
          ticketId: ticket.id,
          output: { ticketId: ticket.id },
          triggeredBy,
        },
      });
      break;
    }

    case 'update_booking_status': {
      if (!event.bookingId || !action.status) break;

      await prisma.booking.update({
        where: { id: event.bookingId },
        data: { status: action.status as BookingStatus },
      });

      await prisma.aiAction.create({
        data: {
          action: 'update_booking_status',
          reason: `Rule updated booking status to ${action.status}`,
          outcome: AiActionOutcome.SUCCESS,
          bookingId: event.bookingId,
          eventId: event.id,
          input: { newStatus: action.status },
          triggeredBy,
        },
      });
      break;
    }

    case 'emit_event': {
      if (!action.eventType) break;

      await prisma.event.create({
        data: {
          type: action.eventType as EventType,
          source: 'rule',
          bookingId: event.bookingId,
          paymentId: event.paymentId,
          payload: { parentEventId: event.id, triggeredByRule: ruleId },
        },
      });
      break;
    }

    case 'notify_ops': {
      // In production, this would send a Slack/PagerDuty notification
      console.log(`[OPS NOTIFICATION] ${action.message || event.type}`, {
        eventId: event.id,
        bookingId: event.bookingId,
      });

      await prisma.aiAction.create({
        data: {
          action: 'notify_ops',
          reason: action.message || `Ops notified about ${event.type}`,
          outcome: AiActionOutcome.SUCCESS,
          bookingId: event.bookingId,
          eventId: event.id,
          triggeredBy,
        },
      });
      break;
    }

    default:
      console.warn(`Unknown action type: ${action.type}`);
  }
}

// Build template data from event
function buildTemplateData(event: any): Record<string, string | number | undefined> {
  const booking = event.booking;
  if (!booking) return {};

  const daysOverdue = booking.endDate
    ? Math.max(0, differenceInDays(new Date(), new Date(booking.endDate)))
    : 0;

  return {
    customerName: booking.user?.name,
    customerEmail: booking.user?.email,
    bookingId: booking.id,
    productName: booking.product?.name,
    lockerName: booking.compartment?.locker?.name,
    lockerAddress: booking.compartment?.locker?.address,
    compartmentNumber: booking.compartment?.number,
    accessCode: booking.accessCode,
    startDate: booking.startDate ? new Date(booking.startDate).toLocaleDateString() : undefined,
    endDate: booking.endDate ? new Date(booking.endDate).toLocaleDateString() : undefined,
    totalAmount: booking.totalAmount?.toString(),
    daysOverdue,
    lateFee: (daysOverdue * 10).toString(), // €10 per day late fee example
  };
}

// Build ticket title based on event type
function buildTicketTitle(event: any, action: RuleAction): string {
  switch (event.type) {
    case EventType.LOCKER_OPEN_FAILED:
      return `Locker Open Failed - Booking ${event.bookingId?.substring(0, 8)}`;
    case EventType.BOOKING_OVERDUE:
      return `Overdue Rental - Booking ${event.bookingId?.substring(0, 8)}`;
    case EventType.PAYMENT_FAILED:
      return `Payment Failed - Booking ${event.bookingId?.substring(0, 8)}`;
    default:
      return `${event.type} - Requires Attention`;
  }
}

// Build ticket description based on event
function buildTicketDescription(event: any, action: RuleAction): string {
  const booking = event.booking;
  let description = `Automated ticket created for event: ${event.type}\n\n`;

  if (booking) {
    description += `Booking Details:\n`;
    description += `- ID: ${booking.id}\n`;
    description += `- Customer: ${booking.user?.name} (${booking.user?.email})\n`;
    description += `- Product: ${booking.product?.name}\n`;
    description += `- Status: ${booking.status}\n`;
    description += `- Period: ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}\n`;
  }

  description += `\nEvent Payload:\n${JSON.stringify(event.payload, null, 2)}`;

  return description;
}

// Process scheduled rules (called by cron)
export async function processScheduledRules(): Promise<void> {
  console.log('Processing scheduled rules...');

  const rules = await prisma.rule.findMany({
    where: {
      isActive: true,
      triggerType: RuleTriggerType.SCHEDULE,
    },
    orderBy: { priority: 'desc' },
  });

  for (const rule of rules) {
    // For scheduled rules, we need to find matching bookings
    await processScheduledRule(rule);
  }
}

async function processScheduledRule(rule: any): Promise<void> {
  const conditions = rule.conditions as Record<string, unknown> | null;
  if (!conditions) return;

  // Build booking query from conditions
  const where: any = {};

  if (conditions['booking.status']) {
    where.status = conditions['booking.status'];
  }

  // Find matching bookings
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      user: true,
      product: true,
      compartment: {
        include: { locker: true },
      },
    },
  });

  for (const booking of bookings) {
    // Create a synthetic event for evaluation
    const syntheticEvent = {
      id: `scheduled-${rule.id}-${booking.id}`,
      type: 'MANUAL_TRIGGER',
      bookingId: booking.id,
      booking,
      payload: { rule: rule.id, scheduled: true },
    };

    // Check additional conditions
    const conditionsMet = await evaluateConditions(conditions, syntheticEvent);
    if (!conditionsMet) continue;

    // Execute actions
    const actions = rule.actions as RuleAction[];
    for (const action of actions) {
      await executeAction(action, syntheticEvent, rule.id);
    }
  }
}

// Check for overdue bookings
export async function checkOverdueBookings(): Promise<void> {
  console.log('Checking for overdue bookings...');

  const overdueBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.ACTIVE,
      endDate: { lt: new Date() },
    },
  });

  for (const booking of overdueBookings) {
    // Update status
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.OVERDUE },
    });

    // Create event
    await prisma.event.create({
      data: {
        type: EventType.BOOKING_OVERDUE,
        source: 'cron',
        bookingId: booking.id,
        payload: { previousStatus: 'ACTIVE' },
      },
    });
  }

  console.log(`Marked ${overdueBookings.length} bookings as overdue`);
}

// Send return reminders
export async function sendReturnReminders(): Promise<void> {
  console.log('Sending return reminders...');

  const reminderWindow = addHours(new Date(), 24);

  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.ACTIVE,
      endDate: {
        gt: new Date(),
        lte: reminderWindow,
      },
    },
    include: {
      user: true,
      product: true,
      compartment: {
        include: { locker: true },
      },
    },
  });

  for (const booking of bookings) {
    // Check if we already sent a reminder for this booking
    const existingReminder = await prisma.event.findFirst({
      where: {
        bookingId: booking.id,
        type: EventType.REMINDER_RETURN,
        createdAt: { gte: addHours(new Date(), -12) }, // Within last 12 hours
      },
    });

    if (existingReminder) continue;

    // Create reminder event
    await prisma.event.create({
      data: {
        type: EventType.REMINDER_RETURN,
        source: 'cron',
        bookingId: booking.id,
        payload: { hoursUntilEnd: differenceInHours(new Date(booking.endDate), new Date()) },
      },
    });
  }

  console.log(`Queued ${bookings.length} return reminders`);
}
