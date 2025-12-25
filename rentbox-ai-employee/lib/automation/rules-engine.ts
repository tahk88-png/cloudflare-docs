import { db } from '../db';
import { Event } from '../types';
import { sendEmail, renderTemplate as renderEmailTemplate } from '../email';
import { sendSMS, renderTemplate as renderSMSTemplate } from '../sms';
import { createTicket } from '../ai/tools/create-ticket';
import { logAIAction } from '../ai/tools/log-action';
import { getTemplate } from '../templates';

export async function processEvent(eventId: number): Promise<void> {
  const eventResult = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
  if (eventResult.rows.length === 0) {
    return;
  }

  const event: Event = eventResult.rows[0];

  // Get all enabled rules that match this event type
  const rulesResult = await db.query(
    `SELECT * FROM rules WHERE enabled = true AND (event_type = $1 OR event_type IS NULL)`,
    [event.event_type]
  );

  for (const rule of rulesResult.rows) {
    if (await evaluateCondition(rule.condition, event)) {
      await executeAction(rule.action_type, rule.action_config, event);
    }
  }

  // Mark event as processed
  await db.query('UPDATE events SET processed = true WHERE id = $1', [eventId]);
}

async function evaluateCondition(condition: any, event: Event): Promise<boolean> {
  // Simple condition evaluation - can be enhanced
  if (condition.type === 'equals') {
    return event.event_data[condition.field] === condition.value;
  }
  if (condition.type === 'contains') {
    const value = event.event_data[condition.field];
    return String(value).includes(condition.value);
  }
  if (condition.type === 'and') {
    return condition.conditions.every((c: any) => evaluateCondition(c, event));
  }
  if (condition.type === 'or') {
    return condition.conditions.some((c: any) => evaluateCondition(c, event));
  }
  return false;
}

async function executeAction(actionType: string, config: any, event: Event): Promise<void> {
  try {
    switch (actionType) {
      case 'send_email':
        await executeSendEmail(config, event);
        break;
      case 'send_sms':
        await executeSendSMS(config, event);
        break;
      case 'create_ticket':
        await executeCreateTicket(config, event);
        break;
      case 'log_action':
        await executeLogAction(config, event);
        break;
      default:
        console.warn(`Unknown action type: ${actionType}`);
    }
  } catch (error) {
    console.error(`Error executing action ${actionType}:`, error);
    await logAIAction({
      actionType: 'action_error',
      userId: event.user_id || null,
      bookingId: event.booking_id || null,
      reason: `Failed to execute ${actionType}`,
      outcome: String(error),
    });
  }
}

async function executeSendEmail(config: any, event: Event): Promise<void> {
  const template = await getTemplate(config.template_name);
  if (!template) {
    throw new Error(`Template not found: ${config.template_name}`);
  }

  // Get user email
  let email = config.to;
  if (!email && event.user_id) {
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [event.user_id]);
    if (userResult.rows.length > 0) {
      email = userResult.rows[0].email;
    }
  }

  if (!email) {
    throw new Error('No email address found');
  }

  const variables = await getTemplateVariables(event);
  const rendered = renderEmailTemplate(template.content, variables);

  await sendEmail({
    to: email,
    subject: template.subject || config.subject || 'Rentbox Notification',
    html: rendered,
  });

  await logAIAction({
    actionType: 'send_email',
    userId: event.user_id || null,
    bookingId: event.booking_id || null,
    reason: `Automated email: ${config.template_name}`,
    outcome: 'Email sent successfully',
    metadata: { template: config.template_name, to: email },
  });
}

async function executeSendSMS(config: any, event: Event): Promise<void> {
  const template = await getTemplate(config.template_name);
  if (!template) {
    throw new Error(`Template not found: ${config.template_name}`);
  }

  // Get user phone
  let phone = config.to;
  if (!phone && event.user_id) {
    const userResult = await db.query('SELECT phone FROM users WHERE id = $1', [event.user_id]);
    if (userResult.rows.length > 0) {
      phone = userResult.rows[0].phone;
    }
  }

  if (!phone) {
    throw new Error('No phone number found');
  }

  const variables = await getTemplateVariables(event);
  const rendered = renderSMSTemplate(template.content, variables);

  await sendSMS({
    to: phone,
    body: rendered,
  });

  await logAIAction({
    actionType: 'send_sms',
    userId: event.user_id || null,
    bookingId: event.booking_id || null,
    reason: `Automated SMS: ${config.template_name}`,
    outcome: 'SMS sent successfully',
    metadata: { template: config.template_name, to: phone },
  });
}

async function executeCreateTicket(config: any, event: Event): Promise<void> {
  if (!event.user_id) {
    throw new Error('User ID required for ticket creation');
  }

  const variables = await getTemplateVariables(event);
  const title = renderTemplate(config.title || 'Support Ticket', variables);
  const description = renderTemplate(config.description || '', variables);

  const ticket = await createTicket({
    userId: event.user_id,
    bookingId: event.booking_id || null,
    title,
    description,
    priority: config.priority || 'medium',
  });

  await logAIAction({
    actionType: 'create_ticket',
    userId: event.user_id,
    bookingId: event.booking_id || null,
    ticketId: ticket.id,
    reason: `Automated ticket: ${event.event_type}`,
    outcome: `Ticket #${ticket.id} created`,
  });
}

async function executeLogAction(config: any, event: Event): Promise<void> {
  const variables = await getTemplateVariables(event);
  const reason = renderTemplate(config.reason || 'Automated action', variables);
  const outcome = config.outcome ? renderTemplate(config.outcome, variables) : undefined;

  await logAIAction({
    actionType: config.action_type || 'log_action',
    userId: event.user_id || null,
    bookingId: event.booking_id || null,
    reason,
    outcome,
    metadata: config.metadata,
  });
}

async function getTemplateVariables(event: Event): Promise<Record<string, any>> {
  const variables: Record<string, any> = {
    ...event.event_data,
  };

  if (event.booking_id) {
    const bookingResult = await db.query(
      `SELECT b.*, u.email, u.name, u.phone, p.name as product_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN products p ON b.product_id = p.id
       WHERE b.id = $1`,
      [event.booking_id]
    );
    if (bookingResult.rows.length > 0) {
      const booking = bookingResult.rows[0];
      variables.booking_id = booking.id;
      variables.user_name = booking.name;
      variables.user_email = booking.email;
      variables.user_phone = booking.phone;
      variables.product_name = booking.product_name;
      variables.start_time = booking.start_time;
      variables.end_time = booking.end_time;
      variables.pickup_code = booking.pickup_code;
    }
  }

  if (event.user_id) {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [event.user_id]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      variables.user_name = user.name;
      variables.user_email = user.email;
      variables.user_phone = user.phone;
    }
  }

  return variables;
}

function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return rendered;
}
