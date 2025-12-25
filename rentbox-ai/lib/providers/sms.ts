import { query } from '../db';

export interface SMSOptions {
  to: string;
  message: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Base SMS Provider interface
export abstract class SMSProvider {
  abstract send(options: SMSOptions): Promise<SMSResult>;
}

// Twilio implementation
export class TwilioSMSProvider extends SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    super();
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async send(options: SMSOptions): Promise<SMSResult> {
    try {
      // Twilio API call simulation (would use actual Twilio SDK in production)
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: options.to,
            From: this.fromNumber,
            Body: options.message
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          messageId: data.sid
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `Twilio API error: ${error}`
        };
      }
    } catch (error: any) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Mock SMS Provider for development/testing
export class MockSMSProvider extends SMSProvider {
  async send(options: SMSOptions): Promise<SMSResult> {
    console.log('Mock SMS sent:', options);
    return {
      success: true,
      messageId: `mock_${Date.now()}`
    };
  }
}

// Factory function to get the appropriate provider
export function getSMSProvider(): SMSProvider {
  const provider = process.env.SMS_PROVIDER || 'mock';

  switch (provider.toLowerCase()) {
    case 'twilio':
      return new TwilioSMSProvider();
    case 'mock':
    default:
      return new MockSMSProvider();
  }
}

export class RateLimitedSMSProvider {
  private provider: SMSProvider;
  private maxSMSPerHour: number;

  constructor(provider?: SMSProvider, maxSMSPerHour?: number) {
    this.provider = provider || getSMSProvider();
    this.maxSMSPerHour = maxSMSPerHour || parseInt(process.env.MAX_SMS_PER_HOUR || '5');
  }

  async canSend(userId: number): Promise<{ allowed: boolean; remaining: number }> {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 1);

    const result = await query(
      `SELECT COALESCE(SUM(count), 0) as total
       FROM rate_limits
       WHERE user_id = $1 
         AND message_type = 'sms'
         AND window_start > $2`,
      [userId, windowStart]
    );

    const total = parseInt(result.rows[0]?.total || '0');
    const remaining = Math.max(0, this.maxSMSPerHour - total);

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
       VALUES ($1, 'sms', 1, $2)
       ON CONFLICT (user_id, message_type, window_start)
       DO UPDATE SET count = rate_limits.count + 1, updated_at = NOW()`,
      [userId, windowStart]
    );
  }

  async sendWithRateLimit(
    userId: number,
    options: SMSOptions
  ): Promise<SMSResult & { rateLimited?: boolean }> {
    const { allowed, remaining } = await this.canSend(userId);

    if (!allowed) {
      return {
        success: false,
        rateLimited: true,
        error: `Rate limit exceeded. No SMS remaining in current hour.`
      };
    }

    const result = await this.provider.send(options);

    if (result.success) {
      await this.incrementCounter(userId);
    }

    return result;
  }
}
