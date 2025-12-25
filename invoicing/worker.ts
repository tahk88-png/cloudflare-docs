// Cloudflare Worker entry point for invoicing system

import type { D1Database } from '@cloudflare/workers-types';
import { handleRequest } from './api/router';
import { processEmailQueue, type EmailProvider } from './services/email-service';
import { processReminders } from './services/reminder-service';
import { cleanupExpiredTokens } from './services/view-token-service';

export interface Env {
  // Database
  DB: D1Database;
  
  // R2 Storage
  INVOICES_BUCKET: R2Bucket;
  
  // Email service (configure your provider)
  EMAIL_PROVIDER?: string; // 'sendgrid', 'mailgun', 'resend', etc.
  EMAIL_API_KEY?: string;
  
  // Stripe/Montonio keys
  STRIPE_API_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  MONTONIO_API_KEY?: string;
  MONTONIO_WEBHOOK_SECRET?: string;
  
  // Scheduled tasks
  ENABLE_SCHEDULED_TASKS?: string; // 'true' or 'false'
}

/**
 * Main worker handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Create email provider
    const emailProvider = createEmailProvider(env);
    
    // Handle request
    return handleRequest(request, {
      db: env.DB,
      r2: env.INVOICES_BUCKET,
      emailProvider,
    });
  },
  
  /**
   * Scheduled tasks (cron jobs)
   * Run every 5 minutes for email queue and reminders
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (env.ENABLE_SCHEDULED_TASKS !== 'true') {
      return;
    }
    
    const emailProvider = createEmailProvider(env);
    
    try {
      // Process email queue
      await processEmailQueue(env.DB, emailProvider, 50);
      
      // Process reminders
      await processReminders(env.DB, emailProvider);
      
      // Cleanup expired tokens (once per day)
      const hour = new Date().getHours();
      if (hour === 3) { // 3 AM
        await cleanupExpiredTokens(env.DB);
      }
      
      console.log('Scheduled tasks completed successfully');
    } catch (error) {
      console.error('Scheduled tasks error:', error);
    }
  },
};

/**
 * Create email provider based on configuration
 */
function createEmailProvider(env: Env): EmailProvider {
  const provider = env.EMAIL_PROVIDER || 'console';
  
  switch (provider) {
    case 'sendgrid':
      return createSendGridProvider(env.EMAIL_API_KEY || '');
    
    case 'mailgun':
      return createMailgunProvider(env.EMAIL_API_KEY || '');
    
    case 'resend':
      return createResendProvider(env.EMAIL_API_KEY || '');
    
    default:
      // Console provider for development
      return createConsoleProvider();
  }
}

/**
 * SendGrid email provider
 */
function createSendGridProvider(apiKey: string): EmailProvider {
  return {
    async send(params) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: params.to }],
            }],
            from: { email: params.from },
            reply_to: { email: params.replyTo },
            subject: params.subject,
            content: [
              { type: 'text/html', value: params.html },
              ...(params.text ? [{ type: 'text/plain', value: params.text }] : []),
            ],
            attachments: params.attachments?.map(att => ({
              filename: att.filename,
              content: att.url, // In production, download and base64 encode
              type: 'application/pdf',
            })),
          }),
        });
        
        if (!response.ok) {
          throw new Error(`SendGrid API error: ${response.status}`);
        }
        
        const messageId = response.headers.get('x-message-id') || 'unknown';
        
        return {
          messageId,
          status: 'sent',
        };
      } catch (error: any) {
        console.error('SendGrid send error:', error);
        throw error;
      }
    },
  };
}

/**
 * Mailgun email provider
 */
function createMailgunProvider(apiKey: string): EmailProvider {
  return {
    async send(params) {
      try {
        // Mailgun implementation
        const domain = 'your-domain.com'; // Configure domain
        const formData = new FormData();
        formData.append('from', params.from);
        formData.append('to', params.to);
        formData.append('h:Reply-To', params.replyTo);
        formData.append('subject', params.subject);
        formData.append('html', params.html);
        if (params.text) {
          formData.append('text', params.text);
        }
        
        const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Mailgun API error: ${response.status}`);
        }
        
        const result = await response.json() as any;
        
        return {
          messageId: result.id || 'unknown',
          status: 'sent',
        };
      } catch (error: any) {
        console.error('Mailgun send error:', error);
        throw error;
      }
    },
  };
}

/**
 * Resend email provider
 */
function createResendProvider(apiKey: string): EmailProvider {
  return {
    async send(params) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: params.from,
            to: [params.to],
            reply_to: params.replyTo,
            subject: params.subject,
            html: params.html,
            text: params.text,
            attachments: params.attachments?.map(att => ({
              filename: att.filename,
              path: att.url,
            })),
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }
        
        const result = await response.json() as any;
        
        return {
          messageId: result.id || 'unknown',
          status: 'sent',
        };
      } catch (error: any) {
        console.error('Resend send error:', error);
        throw error;
      }
    },
  };
}

/**
 * Console email provider (for development)
 */
function createConsoleProvider(): EmailProvider {
  return {
    async send(params) {
      console.log('=== EMAIL SENT (Console Provider) ===');
      console.log('From:', params.from);
      console.log('Reply-To:', params.replyTo);
      console.log('To:', params.to);
      console.log('Subject:', params.subject);
      console.log('HTML:', params.html.substring(0, 200) + '...');
      if (params.attachments) {
        console.log('Attachments:', params.attachments.map(a => a.filename).join(', '));
      }
      console.log('=====================================');
      
      return {
        messageId: `console_${Date.now()}`,
        status: 'sent',
      };
    },
  };
}
