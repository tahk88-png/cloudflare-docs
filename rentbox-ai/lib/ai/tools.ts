import { BookingRepository } from '../repositories/bookings';
import { TicketRepository } from '../repositories/tickets';
import { AIActionRepository } from '../repositories/ai-actions';
import { TemplateRepository } from '../repositories/templates';
import { RateLimitedEmailProvider } from '../providers/email';
import { RateLimitedSMSProvider } from '../providers/sms';
import { LockerService } from '../providers/locker';
import { query } from '../db';
import { formatDistanceToNow } from 'date-fns';

// Safety validator
export class SafetyValidator {
  static async canOpenLocker(bookingId: number): Promise<{ allowed: boolean; reason?: string }> {
    const booking = await BookingRepository.findById(bookingId);
    
    if (!booking) {
      return { allowed: false, reason: 'Booking not found' };
    }

    // Check if booking is paid
    const isPaid = await BookingRepository.isFullyPaid(bookingId);
    if (!isPaid) {
      return { allowed: false, reason: 'Booking not fully paid' };
    }

    // Check if within allowed time window
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);

    // Allow opening 1 hour before start time
    const allowedStartTime = new Date(startTime.getTime() - 60 * 60 * 1000);
    
    if (now < allowedStartTime) {
      return { 
        allowed: false, 
        reason: `Too early. Pickup available from ${allowedStartTime.toLocaleString()}` 
      };
    }

    if (now > endTime && booking.status === 'completed') {
      return { 
        allowed: false, 
        reason: 'Rental period has ended and booking is completed' 
      };
    }

    // Check booking status
    if (!['confirmed', 'active', 'overdue'].includes(booking.status)) {
      return { 
        allowed: false, 
        reason: `Invalid booking status: ${booking.status}` 
      };
    }

    return { allowed: true };
  }

  static canIssueRefund(): { allowed: boolean; reason: string } {
    // Safety: AI is not allowed to issue refunds
    return {
      allowed: false,
      reason: 'AI cannot issue refunds. Please escalate to human agent.'
    };
  }

  static canModifyPayment(): { allowed: boolean; reason: string } {
    // Safety: AI is not allowed to modify payments
    return {
      allowed: false,
      reason: 'AI cannot modify payments. Please escalate to human agent.'
    };
  }
}

// Tool definitions for AI agents
export const tools = [
  {
    type: 'function',
    function: {
      name: 'get_booking',
      description: 'Retrieve booking details by booking ID. Returns booking info, user, product, locker, and payment status.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'number',
            description: 'The booking ID to retrieve'
          }
        },
        required: ['booking_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_ticket',
      description: 'Create a support ticket for issues that require human intervention',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'number',
            description: 'Related booking ID (optional)'
          },
          user_id: {
            type: 'number',
            description: 'User ID who reported the issue'
          },
          title: {
            type: 'string',
            description: 'Short title for the ticket'
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Priority level'
          },
          category: {
            type: 'string',
            enum: ['locker_issue', 'payment_issue', 'product_issue', 'other'],
            description: 'Issue category'
          }
        },
        required: ['user_id', 'title', 'description', 'priority']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email to a user. Rate limited per user.',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'number',
            description: 'User ID to send email to'
          },
          template_name: {
            type: 'string',
            description: 'Name of the email template to use'
          },
          variables: {
            type: 'object',
            description: 'Variables to populate the template'
          }
        },
        required: ['user_id', 'template_name', 'variables']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_sms',
      description: 'Send an SMS to a user. Rate limited per user.',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'number',
            description: 'User ID to send SMS to'
          },
          template_name: {
            type: 'string',
            description: 'Name of the SMS template to use'
          },
          variables: {
            type: 'object',
            description: 'Variables to populate the template'
          }
        },
        required: ['user_id', 'template_name', 'variables']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_locker',
      description: 'Attempt to open a locker compartment. Only allowed if booking is paid and within time window.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'number',
            description: 'Booking ID associated with the compartment'
          }
        },
        required: ['booking_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_ai_action',
      description: 'Log an AI action for audit purposes',
      parameters: {
        type: 'object',
        properties: {
          action_type: {
            type: 'string',
            description: 'Type of action performed'
          },
          booking_id: {
            type: 'number',
            description: 'Related booking ID (optional)'
          },
          user_id: {
            type: 'number',
            description: 'Related user ID (optional)'
          },
          reason: {
            type: 'string',
            description: 'Reason for the action'
          },
          outcome: {
            type: 'string',
            enum: ['success', 'failed', 'skipped'],
            description: 'Outcome of the action'
          }
        },
        required: ['action_type', 'reason', 'outcome']
      }
    }
  }
];

// Tool execution functions
export class ToolExecutor {
  private emailProvider: RateLimitedEmailProvider;
  private smsProvider: RateLimitedSMSProvider;
  private lockerService: LockerService;

  constructor() {
    this.emailProvider = new RateLimitedEmailProvider();
    this.smsProvider = new RateLimitedSMSProvider();
    this.lockerService = new LockerService();
  }

  async execute(toolName: string, args: any, agentType: string): Promise<any> {
    console.log(`Executing tool: ${toolName}`, { args, agentType });

    switch (toolName) {
      case 'get_booking':
        return this.getBooking(args.booking_id);
      
      case 'create_ticket':
        return this.createTicket(args, agentType);
      
      case 'send_email':
        return this.sendEmail(args, agentType);
      
      case 'send_sms':
        return this.sendSMS(args, agentType);
      
      case 'open_locker':
        return this.openLocker(args.booking_id, agentType);
      
      case 'log_ai_action':
        return this.logAction(args, agentType);
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  private async getBooking(bookingId: number) {
    try {
      const booking = await BookingRepository.findById(bookingId);
      
      if (!booking) {
        return { error: 'Booking not found' };
      }

      const payments = await BookingRepository.getPayments(bookingId);
      const isPaid = await BookingRepository.isFullyPaid(bookingId);

      return {
        booking,
        payments,
        is_fully_paid: isPaid,
        time_until_start: booking.start_time > new Date() 
          ? formatDistanceToNow(new Date(booking.start_time), { addSuffix: true })
          : null,
        time_until_end: booking.end_time > new Date()
          ? formatDistanceToNow(new Date(booking.end_time), { addSuffix: true })
          : null,
        is_overdue: booking.end_time < new Date() && booking.status !== 'completed'
      };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private async createTicket(args: any, agentType: string) {
    try {
      const ticket = await TicketRepository.create({
        booking_id: args.booking_id,
        user_id: args.user_id,
        title: args.title,
        description: args.description,
        priority: args.priority,
        category: args.category
      });

      await AIActionRepository.log({
        action_type: 'create_ticket',
        agent_type: agentType,
        booking_id: args.booking_id,
        user_id: args.user_id,
        ticket_id: ticket.id,
        reason: args.description,
        outcome: 'success'
      });

      return { success: true, ticket_id: ticket.id };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private async sendEmail(args: any, agentType: string) {
    try {
      const userResult = await query(
        'SELECT * FROM users WHERE id = $1',
        [args.user_id]
      );

      if (userResult.rows.length === 0) {
        return { error: 'User not found' };
      }

      const user = userResult.rows[0];
      const template = await TemplateRepository.findByName(args.template_name);

      if (!template || template.type !== 'email') {
        return { error: 'Email template not found' };
      }

      const rendered = TemplateRepository.renderTemplate(template, args.variables);
      
      const result = await this.emailProvider.sendWithRateLimit(args.user_id, {
        to: user.email,
        subject: rendered.subject || 'Rentbox Notification',
        html: rendered.body
      });

      await AIActionRepository.log({
        action_type: 'send_email',
        agent_type: agentType,
        user_id: args.user_id,
        booking_id: args.variables?.booking_id,
        reason: `Sent email using template: ${args.template_name}`,
        outcome: result.success ? 'success' : 'failed',
        outcome_details: result.error || result.messageId,
        metadata: { template_name: args.template_name, rate_limited: result.rateLimited }
      });

      return result;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private async sendSMS(args: any, agentType: string) {
    try {
      const userResult = await query(
        'SELECT * FROM users WHERE id = $1',
        [args.user_id]
      );

      if (userResult.rows.length === 0) {
        return { error: 'User not found' };
      }

      const user = userResult.rows[0];
      
      if (!user.phone) {
        return { error: 'User has no phone number' };
      }

      const template = await TemplateRepository.findByName(args.template_name);

      if (!template || template.type !== 'sms') {
        return { error: 'SMS template not found' };
      }

      const rendered = TemplateRepository.renderTemplate(template, args.variables);
      
      const result = await this.smsProvider.sendWithRateLimit(args.user_id, {
        to: user.phone,
        message: rendered.body
      });

      await AIActionRepository.log({
        action_type: 'send_sms',
        agent_type: agentType,
        user_id: args.user_id,
        booking_id: args.variables?.booking_id,
        reason: `Sent SMS using template: ${args.template_name}`,
        outcome: result.success ? 'success' : 'failed',
        outcome_details: result.error || result.messageId,
        metadata: { template_name: args.template_name, rate_limited: result.rateLimited }
      });

      return result;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private async openLocker(bookingId: number, agentType: string) {
    try {
      // Safety check
      const safetyCheck = await SafetyValidator.canOpenLocker(bookingId);
      
      if (!safetyCheck.allowed) {
        await AIActionRepository.log({
          action_type: 'open_locker',
          agent_type: agentType,
          booking_id: bookingId,
          reason: 'Attempted to open locker',
          outcome: 'skipped',
          outcome_details: safetyCheck.reason
        });

        return { 
          success: false, 
          error: safetyCheck.reason,
          safety_blocked: true
        };
      }

      const booking = await BookingRepository.findById(bookingId);
      
      if (!booking || !booking.compartment?.locker) {
        return { error: 'Booking or locker information not found' };
      }

      const result = await this.lockerService.openCompartment(
        booking.compartment.locker,
        booking.compartment,
        booking.pickup_code || ''
      );

      await AIActionRepository.log({
        action_type: 'open_locker',
        agent_type: agentType,
        booking_id: bookingId,
        user_id: booking.user_id,
        reason: 'AI-initiated locker opening',
        outcome: result.success ? 'success' : 'failed',
        outcome_details: result.error || 'Locker opened successfully'
      });

      return result;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private async logAction(args: any, agentType: string) {
    try {
      await AIActionRepository.log({
        action_type: args.action_type,
        agent_type: agentType,
        booking_id: args.booking_id,
        user_id: args.user_id,
        reason: args.reason,
        outcome: args.outcome,
        outcome_details: args.outcome_details
      });

      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
