import { prisma } from '@/lib/db';
import { sendEmail, sendTemplatedEmail, renderTemplate } from '@/lib/providers/email';
import { sendSms, sendTemplatedSms, checkSmsRateLimit, incrementMessageCount } from '@/lib/providers/sms';
import { openLocker, checkLockerOpenSafety } from '@/lib/providers/locker';
import { TicketPriority, TicketCategory, AiActionOutcome, AgentRole } from '@prisma/client';

// Tool definitions for AI agents
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================
// BOOKING TOOLS
// ============================================

export async function getBooking(bookingId: string): Promise<ToolResult> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        product: true,
        compartment: {
          include: { locker: true },
        },
        payments: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    return { success: true, data: booking };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function listUserBookings(userId: string): Promise<ToolResult> {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        product: true,
        compartment: {
          include: { locker: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { success: true, data: bookings };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// TICKET TOOLS
// ============================================

interface CreateTicketParams {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  bookingId?: string;
  createdById: string;
  assignedToId?: string;
}

export async function createTicket(params: CreateTicketParams): Promise<ToolResult> {
  try {
    const ticket = await prisma.ticket.create({
      data: {
        title: params.title,
        description: params.description,
        category: params.category,
        priority: params.priority,
        bookingId: params.bookingId,
        createdById: params.createdById,
        assignedToId: params.assignedToId,
      },
    });

    return { success: true, data: ticket };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  resolution?: string
): Promise<ToolResult> {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: status as any,
        resolution,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
      },
    });

    return { success: true, data: ticket };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// COMMUNICATION TOOLS
// ============================================

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmailTool(
  params: SendEmailParams,
  triggeredBy: string,
  agentRole?: AgentRole
): Promise<ToolResult> {
  try {
    const result = await sendEmail(params);

    // Log the action
    await prisma.aiAction.create({
      data: {
        action: 'send_email',
        reason: `Sent email to ${params.to}: ${params.subject}`,
        outcome: result.success ? AiActionOutcome.SUCCESS : AiActionOutcome.FAILED,
        input: { to: params.to, subject: params.subject },
        output: result.success ? { messageId: result.messageId } : undefined,
        error: result.error,
        triggeredBy,
        agentRole,
      },
    });

    return { success: result.success, data: result, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface SendTemplatedEmailParams {
  templateName: string;
  to: string;
  data: Record<string, string | number | undefined>;
}

export async function sendTemplatedEmailTool(
  params: SendTemplatedEmailParams,
  triggeredBy: string,
  agentRole?: AgentRole
): Promise<ToolResult> {
  try {
    const result = await sendTemplatedEmail(params.templateName, params.to, params.data);

    await prisma.aiAction.create({
      data: {
        action: 'send_templated_email',
        reason: `Sent templated email '${params.templateName}' to ${params.to}`,
        outcome: result.success ? AiActionOutcome.SUCCESS : AiActionOutcome.FAILED,
        input: params as any,
        output: result.success ? { messageId: result.messageId } : undefined,
        error: result.error,
        triggeredBy,
        agentRole,
      },
    });

    return { success: result.success, data: result, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface SendSmsParams {
  to: string;
  body: string;
  userId: string;
}

export async function sendSmsTool(
  params: SendSmsParams,
  triggeredBy: string,
  agentRole?: AgentRole
): Promise<ToolResult> {
  try {
    // Check rate limit
    const canSend = await checkSmsRateLimit(params.userId);
    if (!canSend) {
      await prisma.aiAction.create({
        data: {
          action: 'send_sms',
          reason: `Rate limited: attempted SMS to ${params.to}`,
          outcome: AiActionOutcome.SKIPPED,
          input: { to: params.to },
          error: 'Rate limit exceeded',
          triggeredBy,
          agentRole,
        },
      });
      return { success: false, error: 'Rate limit exceeded for this user' };
    }

    const result = await sendSms({ to: params.to, body: params.body });

    if (result.success) {
      await incrementMessageCount(params.userId);
    }

    await prisma.aiAction.create({
      data: {
        action: 'send_sms',
        reason: `Sent SMS to ${params.to}`,
        outcome: result.success ? AiActionOutcome.SUCCESS : AiActionOutcome.FAILED,
        input: { to: params.to, bodyLength: params.body.length },
        output: result.success ? { messageId: result.messageId } : undefined,
        error: result.error,
        triggeredBy,
        agentRole,
      },
    });

    return { success: result.success, data: result, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// LOCKER TOOLS
// ============================================

export async function openLockerTool(
  bookingId: string,
  reason: string,
  triggeredBy: string,
  agentRole?: AgentRole
): Promise<ToolResult> {
  try {
    // Safety check first
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { compartmentId: true },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const safetyCheck = await checkLockerOpenSafety(bookingId, booking.compartmentId);
    if (!safetyCheck.allowed) {
      await prisma.aiAction.create({
        data: {
          action: 'open_locker',
          reason,
          outcome: AiActionOutcome.FAILED,
          bookingId,
          error: safetyCheck.reason,
          triggeredBy,
          agentRole,
        },
      });
      return { success: false, error: safetyCheck.reason };
    }

    const result = await openLocker(bookingId, reason);

    return { success: result.success, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// LOGGING TOOLS
// ============================================

interface LogAiActionParams {
  action: string;
  reason: string;
  outcome: AiActionOutcome;
  bookingId?: string;
  eventId?: string;
  ticketId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  triggeredBy: string;
  agentRole?: AgentRole;
}

export async function logAiAction(params: LogAiActionParams): Promise<ToolResult> {
  try {
    const action = await prisma.aiAction.create({
      data: {
        action: params.action,
        reason: params.reason,
        outcome: params.outcome,
        bookingId: params.bookingId,
        eventId: params.eventId,
        ticketId: params.ticketId,
        input: params.input as any,
        output: params.output as any,
        error: params.error,
        triggeredBy: params.triggeredBy,
        agentRole: params.agentRole,
        completedAt: params.outcome !== AiActionOutcome.PENDING ? new Date() : undefined,
      },
    });

    return { success: true, data: action };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// TOOL DEFINITIONS FOR OPENAI
// ============================================

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'get_booking',
      description: 'Get details of a specific booking by ID, including customer info, product, locker, and payment status',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'The unique identifier of the booking',
          },
        },
        required: ['booking_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_user_bookings',
      description: 'List recent bookings for a user',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The unique identifier of the user',
          },
        },
        required: ['user_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_ticket',
      description: 'Create a support ticket for an issue that needs human attention',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short title describing the issue',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue',
          },
          category: {
            type: 'string',
            enum: ['GENERAL', 'LOCKER_ISSUE', 'PAYMENT_ISSUE', 'BOOKING_ISSUE', 'RETURN_ISSUE', 'DAMAGE_REPORT', 'OTHER'],
            description: 'Category of the ticket',
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Priority level of the ticket',
          },
          booking_id: {
            type: 'string',
            description: 'Optional: Related booking ID',
          },
        },
        required: ['title', 'description', 'category', 'priority'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_email',
      description: 'Send an email to a customer. Do NOT use for refunds or payment changes.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Email address to send to',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body content',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_sms',
      description: 'Send an SMS to a customer phone number. Subject to rate limits.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Phone number to send SMS to (E.164 format)',
          },
          body: {
            type: 'string',
            description: 'SMS message content (max 160 characters)',
          },
        },
        required: ['to', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'open_locker',
      description: 'Open a locker compartment for a booking. Only works if booking is paid and within allowed time window.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'The booking ID for the locker access',
          },
          reason: {
            type: 'string',
            description: 'Reason for opening the locker',
          },
        },
        required: ['booking_id', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'log_action',
      description: 'Log an AI action for audit purposes',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Name of the action performed',
          },
          reason: {
            type: 'string',
            description: 'Explanation of why the action was taken',
          },
          outcome: {
            type: 'string',
            enum: ['SUCCESS', 'FAILED', 'SKIPPED'],
            description: 'Result of the action',
          },
        },
        required: ['action', 'reason', 'outcome'],
      },
    },
  },
];

// Execute tool by name
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: { userId: string; conversationId: string; agentRole?: AgentRole }
): Promise<ToolResult> {
  const triggeredBy = `chat:${context.conversationId}`;

  switch (toolName) {
    case 'get_booking':
      return getBooking(args.booking_id as string);

    case 'list_user_bookings':
      return listUserBookings(args.user_id as string);

    case 'create_ticket':
      return createTicket({
        title: args.title as string,
        description: args.description as string,
        category: args.category as TicketCategory,
        priority: args.priority as TicketPriority,
        bookingId: args.booking_id as string | undefined,
        createdById: context.userId,
      });

    case 'send_email':
      return sendEmailTool(
        {
          to: args.to as string,
          subject: args.subject as string,
          body: args.body as string,
        },
        triggeredBy,
        context.agentRole
      );

    case 'send_sms': {
      // Get user phone if not provided
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { phone: true },
      });
      
      return sendSmsTool(
        {
          to: args.to as string,
          body: args.body as string,
          userId: context.userId,
        },
        triggeredBy,
        context.agentRole
      );
    }

    case 'open_locker':
      return openLockerTool(
        args.booking_id as string,
        args.reason as string,
        triggeredBy,
        context.agentRole
      );

    case 'log_action':
      return logAiAction({
        action: args.action as string,
        reason: args.reason as string,
        outcome: args.outcome as AiActionOutcome,
        triggeredBy,
        agentRole: context.agentRole,
      });

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
