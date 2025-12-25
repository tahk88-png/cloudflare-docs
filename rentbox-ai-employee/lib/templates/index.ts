import { db } from '../db';

export interface Template {
  name: string;
  subject?: string;
  content: string;
  type: 'email' | 'sms';
}

const DEFAULT_TEMPLATES: Record<string, Template> = {
  pickup_instructions: {
    name: 'pickup_instructions',
    subject: 'Your Rentbox Pickup Instructions',
    content: `Hello {{user_name}},

Your booking #{{booking_id}} is ready for pickup!

Pickup Code: {{pickup_code}}
Location: {{locker_location}}
Compartment: {{compartment_number}}

You can pick up your item between {{start_time}} and {{end_time}}.

Thank you for using Rentbox!`,
    type: 'email',
  },
  reminder_24h: {
    name: 'reminder_24h',
    subject: 'Reminder: Your Rentbox Booking Ends Tomorrow',
    content: `Hello {{user_name}},

This is a reminder that your booking #{{booking_id}} ends tomorrow at {{end_time}}.

Please make sure to pick up your item before the end time.

Thank you!`,
    type: 'email',
  },
  overdue_notice: {
    name: 'overdue_notice',
    subject: 'Action Required: Overdue Booking',
    content: `Hello {{user_name}},

Your booking #{{booking_id}} has passed its end time. Please contact us immediately to arrange pickup.

Thank you.`,
    type: 'email',
  },
  pickup_sms: {
    name: 'pickup_sms',
    content: `Rentbox: Your booking #{{booking_id}} is ready! Pickup code: {{pickup_code}}. Location: {{locker_location}}`,
    type: 'sms',
  },
};

export async function getTemplate(name: string): Promise<Template | null> {
  // Check database first
  try {
    const result = await db.query('SELECT * FROM message_templates WHERE name = $1', [name]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        name: row.name,
        subject: row.subject,
        content: row.content,
        type: row.type,
      };
    }
  } catch (error) {
    // Table might not exist yet
  }

  // Fall back to default templates
  return DEFAULT_TEMPLATES[name] || null;
}

export async function getAllTemplates(): Promise<Template[]> {
  try {
    const result = await db.query('SELECT * FROM message_templates ORDER BY name');
    return result.rows.map((row) => ({
      name: row.name,
      subject: row.subject,
      content: row.content,
      type: row.type,
    }));
  } catch (error) {
    return Object.values(DEFAULT_TEMPLATES);
  }
}
