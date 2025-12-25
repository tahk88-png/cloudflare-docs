import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface SMSOptions {
  to: string;
  body: string;
}

export async function sendSMS(options: SMSOptions): Promise<void> {
  try {
    await client.messages.create({
      body: options.body,
      to: options.to,
      from: process.env.TWILIO_PHONE_NUMBER || '',
    });
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw error;
  }
}

export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return rendered;
}
