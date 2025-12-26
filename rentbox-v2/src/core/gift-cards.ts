// ============================================================================
// Rentbox v2: Gift Card Purchase Flow
// ============================================================================

import type {
  GiftCardPurchaseRequest,
  GiftCardPurchaseResponse,
  VoucherCreate,
} from '../types';

export interface GiftCardDatabaseAdapter {
  generateVoucherCode(): Promise<string>;
  createVoucher(voucher: VoucherCreate): Promise<{ id: string; code: string }>;
  recordGiftCardPurchase(
    voucherId: string,
    paymentIntentId: string,
    amount: number,
    currency: string,
    userId: string | null
  ): Promise<void>;
}

export interface PaymentAdapter {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>
  ): Promise<{ id: string; client_secret: string }>;
}

export interface EmailAdapter {
  sendGiftCardEmail(params: {
    recipientEmail: string;
    voucherCode: string;
    amount: number;
    currency: string;
    giftMessage?: string;
    expiresAt: Date | null;
  }): Promise<void>;
}

/**
 * Processes a gift card purchase request.
 * Creates voucher, payment intent, and sends email on success.
 */
export async function purchaseGiftCard(
  request: GiftCardPurchaseRequest,
  userId: string | null,
  db: GiftCardDatabaseAdapter,
  payment: PaymentAdapter,
  email: EmailAdapter
): Promise<{
  voucherId: string;
  voucherCode: string;
  paymentIntentId: string;
  clientSecret: string;
  expiresAt: Date;
}> {
  // Validate amount
  const minAmount = 500; // €5.00 minimum
  const maxAmount = 10000; // €1000.00 maximum
  if (request.amount < minAmount) {
    throw new Error(`Minimum gift card amount is €${(minAmount / 100).toFixed(2)}`);
  }
  if (request.amount > maxAmount) {
    throw new Error(`Maximum gift card amount is €${(maxAmount / 100).toFixed(2)}`);
  }

  // Calculate expiry (default: 24 months)
  const expiresInMonths = request.expires_in_months || 24;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + expiresInMonths);

  // Generate voucher code
  const voucherCode = await db.generateVoucherCode();

  // Create voucher
  const voucher = await db.createVoucher({
    code: voucherCode,
    initial_amount: request.amount,
    remaining_amount: request.amount,
    currency: request.currency || 'EUR',
    expires_at: expiresAt,
    purchased_by_user_id: userId,
    recipient_email: request.recipient_email,
    gift_message: request.gift_message,
  });

  // Create payment intent
  const paymentIntent = await payment.createPaymentIntent(
    request.amount,
    request.currency || 'EUR',
    {
      type: 'gift_card',
      voucher_id: voucher.id,
      voucher_code: voucher.code,
    }
  );

  // Record purchase (creates accounting liability)
  await db.recordGiftCardPurchase(
    voucher.id,
    paymentIntent.id,
    request.amount,
    request.currency || 'EUR',
    userId
  );

  // Note: Email is sent after payment confirmation via webhook
  // See handlePaymentSuccessWebhook()

  return {
    voucherId: voucher.id,
    voucherCode: voucher.code,
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    expiresAt,
  };
}

/**
 * Handles successful payment webhook for gift card purchase.
 * Sends the gift card email to recipient.
 */
export async function handleGiftCardPaymentSuccess(
  paymentIntentId: string,
  db: GiftCardDatabaseAdapter & {
    getVoucherByPaymentIntent(paymentIntentId: string): Promise<{
      voucher_id: string;
      code: string;
      amount: number;
      currency: string;
      recipient_email: string | null;
      gift_message: string | null;
      expires_at: Date | null;
    } | null>;
  },
  email: EmailAdapter
): Promise<void> {
  const purchase = await db.getVoucherByPaymentIntent(paymentIntentId);
  if (!purchase) {
    throw new Error(`Gift card purchase not found for payment intent ${paymentIntentId}`);
  }

  // Send email to recipient (or purchaser if no recipient specified)
  const recipientEmail = purchase.recipient_email || 'customer@rentbox.com'; // Fallback

  await email.sendGiftCardEmail({
    recipientEmail,
    voucherCode: purchase.code,
    amount: purchase.amount,
    currency: purchase.currency,
    giftMessage: purchase.gift_message || undefined,
    expiresAt: purchase.expires_at,
  });
}

/**
 * Validates gift card purchase request
 */
export function validateGiftCardRequest(
  request: GiftCardPurchaseRequest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (request.amount < 500) {
    errors.push('Minimum gift card amount is €5.00');
  }

  if (request.amount > 10000) {
    errors.push('Maximum gift card amount is €1000.00');
  }

  if (request.currency && !/^[A-Z]{3}$/.test(request.currency)) {
    errors.push('Currency must be a valid ISO 4217 code (e.g., EUR, USD)');
  }

  if (request.expires_in_months !== undefined) {
    if (request.expires_in_months < 1) {
      errors.push('Expiry must be at least 1 month');
    }
    if (request.expires_in_months > 60) {
      errors.push('Expiry cannot exceed 60 months');
    }
  }

  if (request.recipient_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.recipient_email)) {
    errors.push('Invalid recipient email address');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
