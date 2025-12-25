import { EventRepository } from '../repositories/events';
import { BookingRepository } from '../repositories/bookings';
import { TicketRepository } from '../repositories/tickets';
import { TemplateRepository } from '../repositories/templates';
import { RateLimitedEmailProvider } from '../providers/email';
import { RateLimitedSMSProvider } from '../providers/sms';
import { AIActionRepository } from '../repositories/ai-actions';
import { AIOrchestrator } from '../ai/orchestrator';
import { query } from '../db';

export interface AutomationRule {
  id: number;
  name: string;
  trigger_type: 'event' | 'time_based' | 'condition';
  trigger_config: any;
  conditions?: any;
  actions: any;
  active: boolean;
}

export class RulesEngine {
  private emailProvider: RateLimitedEmailProvider;
  private smsProvider: RateLimitedSMSProvider;
  private aiOrchestrator: AIOrchestrator;

  constructor() {
    this.emailProvider = new RateLimitedEmailProvider();
    this.smsProvider = new RateLimitedSMSProvider();
    this.aiOrchestrator = new AIOrchestrator();
  }

  async processEvents(): Promise<void> {
    console.log('Processing unprocessed events...');
    
    const events = await EventRepository.findUnprocessed(50);
    
    for (const event of events) {
      try {
        await this.processEvent(event);
        await EventRepository.markAsProcessed(event.id);
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        // Don't mark as processed if there was an error
      }
    }
  }

  private async processEvent(event: any): Promise<void> {
    console.log(`Processing event: ${event.event_type}`, event.id);

    // Get matching rules
    const rulesResult = await query(
      `SELECT * FROM automation_rules 
       WHERE active = true 
         AND trigger_type = 'event'
         AND trigger_config->>'event_type' = $1`,
      [event.event_type]
    );

    const rules = rulesResult.rows;

    for (const rule of rules) {
      // Check if conditions match
      if (await this.evaluateConditions(rule.conditions, event)) {
        await this.executeActions(rule.actions, event, rule);
      }
    }

    // Also notify AI orchestrator about the event
    await this.aiOrchestrator.handleEvent(event.event_type, event.payload);
  }

  private async evaluateConditions(conditions: any, event: any): Promise<boolean> {
    if (!conditions) return true;

    // Simple condition evaluation
    for (const [key, value] of Object.entries(conditions)) {
      const eventValue = event.payload[key];

      if (typeof value === 'string' && value.startsWith('>=')) {
        const threshold = parseInt(value.substring(2));
        if (eventValue < threshold) return false;
      } else if (Array.isArray(value)) {
        if (!value.includes(eventValue)) return false;
      } else if (eventValue !== value) {
        return false;
      }
    }

    return true;
  }

  private async executeActions(actions: any, event: any, rule: AutomationRule): Promise<void> {
    console.log(`Executing actions for rule: ${rule.name}`);

    if (Array.isArray(actions)) {
      for (const action of actions) {
        await this.executeAction(action, event, rule);
      }
    } else if (typeof actions === 'object') {
      await this.executeAction(actions, event, rule);
    }
  }

  private async executeAction(action: string | any, event: any, rule: AutomationRule): Promise<void> {
    let actionType: string;
    let actionParams: any;

    if (typeof action === 'string') {
      const [type, ...params] = action.split(':');
      actionType = type;
      actionParams = params.join(':');
    } else {
      actionType = action.type;
      actionParams = action.params;
    }

    console.log(`Executing action: ${actionType}`, actionParams);

    switch (actionType) {
      case 'send_email':
        await this.sendEmailAction(actionParams, event);
        break;
      
      case 'send_sms':
        await this.sendSMSAction(actionParams, event);
        break;
      
      case 'create_ticket':
        await this.createTicketAction(actionParams, event);
        break;
      
      default:
        console.warn(`Unknown action type: ${actionType}`);
    }

    // Update last run time
    await query(
      `UPDATE automation_rules SET last_run_at = NOW() WHERE id = $1`,
      [rule.id]
    );
  }

  private async sendEmailAction(templateName: string, event: any): Promise<void> {
    const bookingId = event.entity_id || event.payload.booking_id;
    
    if (!bookingId) {
      console.warn('No booking ID for email action');
      return;
    }

    const booking = await BookingRepository.findById(bookingId);
    
    if (!booking || !booking.user) {
      console.warn('Booking or user not found');
      return;
    }

    const template = await TemplateRepository.findByName(templateName);
    
    if (!template || template.type !== 'email') {
      console.warn(`Email template not found: ${templateName}`);
      return;
    }

    // Build variables for template
    const variables = {
      customer_name: booking.user.full_name || 'Customer',
      product_name: booking.product?.name || 'Product',
      locker_location: booking.compartment?.locker?.location || 'Locker',
      compartment_number: booking.compartment?.compartment_number || '',
      pickup_code: booking.pickup_code || '',
      return_code: booking.return_code || '',
      start_time: new Date(booking.start_time).toLocaleString(),
      end_time: new Date(booking.end_time).toLocaleString(),
      booking_id: booking.id
    };

    const rendered = TemplateRepository.renderTemplate(template, variables);

    const result = await this.emailProvider.sendWithRateLimit(booking.user_id, {
      to: booking.user.email,
      subject: rendered.subject || 'Rentbox Notification',
      html: rendered.body
    });

    await AIActionRepository.log({
      action_type: 'send_email',
      agent_type: 'automation',
      booking_id: bookingId,
      user_id: booking.user_id,
      reason: `Automated email sent via rule: ${templateName}`,
      outcome: result.success ? 'success' : 'failed',
      outcome_details: result.error || result.messageId,
      metadata: { template_name: templateName, rate_limited: result.rateLimited }
    });
  }

  private async sendSMSAction(templateName: string, event: any): Promise<void> {
    const bookingId = event.entity_id || event.payload.booking_id;
    
    if (!bookingId) {
      console.warn('No booking ID for SMS action');
      return;
    }

    const booking = await BookingRepository.findById(bookingId);
    
    if (!booking || !booking.user || !booking.user.phone) {
      console.warn('Booking, user, or phone not found');
      return;
    }

    const template = await TemplateRepository.findByName(templateName);
    
    if (!template || template.type !== 'sms') {
      console.warn(`SMS template not found: ${templateName}`);
      return;
    }

    const variables = {
      product_name: booking.product?.name || 'Product',
      locker_location: booking.compartment?.locker?.location || 'Locker',
      compartment_number: booking.compartment?.compartment_number || '',
      pickup_code: booking.pickup_code || '',
      return_code: booking.return_code || '',
      end_time: new Date(booking.end_time).toLocaleString()
    };

    const rendered = TemplateRepository.renderTemplate(template, variables);

    const result = await this.smsProvider.sendWithRateLimit(booking.user_id, {
      to: booking.user.phone,
      message: rendered.body
    });

    await AIActionRepository.log({
      action_type: 'send_sms',
      agent_type: 'automation',
      booking_id: bookingId,
      user_id: booking.user_id,
      reason: `Automated SMS sent via rule: ${templateName}`,
      outcome: result.success ? 'success' : 'failed',
      outcome_details: result.error || result.messageId,
      metadata: { template_name: templateName, rate_limited: result.rateLimited }
    });
  }

  private async createTicketAction(priority: string, event: any): Promise<void> {
    const bookingId = event.entity_id || event.payload.booking_id;
    
    if (!bookingId) {
      console.warn('No booking ID for ticket action');
      return;
    }

    const booking = await BookingRepository.findById(bookingId);
    
    if (!booking) {
      console.warn('Booking not found');
      return;
    }

    // Check if ticket already exists for this issue
    const existingTickets = await TicketRepository.findByBookingId(bookingId);
    const recentOpenTicket = existingTickets.find(
      t => t.status === 'open' && 
      new Date(t.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );

    if (recentOpenTicket) {
      console.log('Recent ticket already exists, skipping');
      return;
    }

    const ticket = await TicketRepository.create({
      booking_id: bookingId,
      user_id: booking.user_id,
      title: `Automated: ${event.event_type}`,
      description: `Automated ticket created from event: ${event.event_type}\n\nPayload: ${JSON.stringify(event.payload, null, 2)}`,
      priority: priority as any || 'medium',
      category: 'locker_issue'
    });

    await AIActionRepository.log({
      action_type: 'create_ticket',
      agent_type: 'automation',
      booking_id: bookingId,
      user_id: booking.user_id,
      ticket_id: ticket.id,
      reason: `Automated ticket from event: ${event.event_type}`,
      outcome: 'success'
    });
  }

  async processTimeBasedRules(): Promise<void> {
    console.log('Processing time-based rules...');

    // Get all active time-based rules
    const rulesResult = await query(
      `SELECT * FROM automation_rules 
       WHERE active = true AND trigger_type = 'time_based'`
    );

    for (const rule of rulesResult.rows) {
      try {
        await this.processTimeBasedRule(rule);
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
      }
    }
  }

  private async processTimeBasedRule(rule: any): Promise<void> {
    console.log(`Processing time-based rule: ${rule.name}`);

    const config = rule.trigger_config;

    // Handle 2-hour reminder
    if (config.time_before_end) {
      const timeBeforeEnd = config.time_before_end === '2 hours' ? 2 : 1;
      
      const bookingsResult = await query(
        `SELECT b.*, u.email, u.phone, u.full_name
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         WHERE b.status = 'active'
           AND b.end_time > NOW()
           AND b.end_time <= NOW() + INTERVAL '${timeBeforeEnd} hours'
           AND NOT EXISTS (
             SELECT 1 FROM ai_actions 
             WHERE action_type = 'reminder_sent' 
               AND booking_id = b.id
               AND created_at > NOW() - INTERVAL '4 hours'
           )`
      );

      for (const booking of bookingsResult.rows) {
        // Execute the rule's actions
        await this.executeActions(rule.actions, { entity_id: booking.id, payload: booking }, rule);
        
        // Log that reminder was sent
        await AIActionRepository.log({
          action_type: 'reminder_sent',
          agent_type: 'automation',
          booking_id: booking.id,
          user_id: booking.user_id,
          reason: `${timeBeforeEnd}-hour return reminder`,
          outcome: 'success'
        });
      }
    }

    // Handle overdue checks
    if (rule.name.toLowerCase().includes('overdue')) {
      const overdueBookings = await BookingRepository.findOverdue();
      
      for (const booking of overdueBookings) {
        // Check if we've already sent an overdue notice recently
        const recentNotice = await query(
          `SELECT * FROM ai_actions
           WHERE action_type = 'send_email'
             AND booking_id = $1
             AND reason LIKE '%overdue%'
             AND created_at > NOW() - INTERVAL '6 hours'
           LIMIT 1`,
          [booking.id]
        );

        if (recentNotice.rows.length === 0) {
          await this.executeActions(rule.actions, { entity_id: booking.id, payload: booking }, rule);
        }
      }
    }
  }
}
