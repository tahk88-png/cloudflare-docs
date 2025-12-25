import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db';
import { ConversationChannel } from '@prisma/client';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const { to, subject, body, html } = params;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Rentbox <noreply@rentbox.ee>',
      to,
      subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>'),
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Template rendering for emails
interface TemplateData {
  [key: string]: string | number | undefined;
}

export function renderTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key]?.toString() || match;
  });
}

// Send templated email
export async function sendTemplatedEmail(
  templateName: string,
  to: string,
  data: TemplateData
): Promise<EmailResult> {
  const template = await prisma.template.findUnique({
    where: { name: templateName },
  });

  if (!template) {
    return { success: false, error: `Template '${templateName}' not found` };
  }

  if (template.channel !== ConversationChannel.EMAIL) {
    return { success: false, error: `Template '${templateName}' is not an email template` };
  }

  const subject = template.subject ? renderTemplate(template.subject, data) : 'Rentbox Notification';
  const body = renderTemplate(template.body, data);

  return sendEmail({ to, subject, body });
}

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email configuration verified');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}
