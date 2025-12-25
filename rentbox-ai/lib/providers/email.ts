import nodemailer from 'nodemailer';
import { query } from '../db';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@rentbox.ee',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email provider verification failed:', error);
      return false;
    }
  }
}

export class RateLimitedEmailProvider extends EmailProvider {
  private maxEmailsPerHour: number;

  constructor(maxEmailsPerHour?: number) {
    super();
    this.maxEmailsPerHour = maxEmailsPerHour || parseInt(process.env.MAX_EMAILS_PER_HOUR || '10');
  }

  async canSend(userId: number): Promise<{ allowed: boolean; remaining: number }> {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 1);

    const result = await query(
      `SELECT COALESCE(SUM(count), 0) as total
       FROM rate_limits
       WHERE user_id = $1 
         AND message_type = 'email'
         AND window_start > $2`,
      [userId, windowStart]
    );

    const total = parseInt(result.rows[0]?.total || '0');
    const remaining = Math.max(0, this.maxEmailsPerHour - total);

    return {
      allowed: remaining > 0,
      remaining
    };
  }

  async incrementCounter(userId: number): Promise<void> {
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    await query(
      `INSERT INTO rate_limits (user_id, message_type, count, window_start)
       VALUES ($1, 'email', 1, $2)
       ON CONFLICT (user_id, message_type, window_start)
       DO UPDATE SET count = rate_limits.count + 1, updated_at = NOW()`,
      [userId, windowStart]
    );
  }

  async sendWithRateLimit(
    userId: number,
    options: EmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string; rateLimited?: boolean }> {
    const { allowed, remaining } = await this.canSend(userId);

    if (!allowed) {
      return {
        success: false,
        rateLimited: true,
        error: `Rate limit exceeded. No emails remaining in current hour.`
      };
    }

    const result = await this.send(options);

    if (result.success) {
      await this.incrementCounter(userId);
    }

    return result;
  }
}
