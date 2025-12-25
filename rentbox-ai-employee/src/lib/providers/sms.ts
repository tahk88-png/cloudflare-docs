import { prisma } from '@/lib/db';
import { ConversationChannel } from '@prisma/client';
import { renderTemplate } from './email';

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

interface SendSmsParams {
  to: string;
  body: string;
}

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Send SMS via Twilio API
export async function sendSms(params: SendSmsParams): Promise<SmsResult> {
  const { to, body } = params;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('SMS provider not configured');
    return { success: false, error: 'SMS provider not configured' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('SMS send failed:', data);
      return { success: false, error: data.message || 'SMS send failed' };
    }

    console.log('SMS sent:', data.sid);
    return { success: true, messageId: data.sid };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send templated SMS
interface TemplateData {
  [key: string]: string | number | undefined;
}

export async function sendTemplatedSms(
  templateName: string,
  to: string,
  data: TemplateData
): Promise<SmsResult> {
  const template = await prisma.template.findUnique({
    where: { name: templateName },
  });

  if (!template) {
    return { success: false, error: `Template '${templateName}' not found` };
  }

  if (template.channel !== ConversationChannel.SMS) {
    return { success: false, error: `Template '${templateName}' is not an SMS template` };
  }

  const body = renderTemplate(template.body, data);

  // Enforce SMS length limit (160 chars for single segment)
  if (body.length > 160) {
    console.warn(`SMS message truncated from ${body.length} to 160 characters`);
  }

  return sendSms({ to, body: body.substring(0, 160) });
}

// Rate limiting check
export async function checkSmsRateLimit(userId: string): Promise<boolean> {
  const maxPerHour = parseInt(process.env.MAX_MESSAGES_PER_USER_PER_HOUR || '10');
  const maxPerDay = parseInt(process.env.MAX_MESSAGES_PER_USER_PER_DAY || '50');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      messageCount: true,
      messageCountResetAt: true,
      lastMessageAt: true,
    },
  });

  if (!user) return false;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Reset counter if needed
  if (!user.messageCountResetAt || user.messageCountResetAt < dayAgo) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        messageCount: 0,
        messageCountResetAt: now,
      },
    });
    return true;
  }

  // Check hourly rate
  if (user.lastMessageAt && user.lastMessageAt > hourAgo) {
    // Simple hourly check - in production would track per-hour counts
    if (user.messageCount >= maxPerHour) {
      return false;
    }
  }

  // Check daily rate
  if (user.messageCount >= maxPerDay) {
    return false;
  }

  return true;
}

// Increment message counter
export async function incrementMessageCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      messageCount: { increment: 1 },
      lastMessageAt: new Date(),
    },
  });
}
