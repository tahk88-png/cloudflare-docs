// ============================================================================
// Rentbox v2: Gift Card API Endpoints
// ============================================================================

import type {
  GiftCardPurchaseRequest,
  GiftCardPurchaseResponse,
  ApiResponse,
  Voucher,
} from '../types';
import {
  purchaseGiftCard,
  validateGiftCardRequest,
  handleGiftCardPaymentSuccess,
} from '../core/gift-cards';

export interface GiftCardApiContext {
  db: any; // GiftCardDatabaseAdapter
  payment: any; // PaymentAdapter
  email: any; // EmailAdapter
  userId?: string;
}

/**
 * POST /api/gift-cards/purchase
 * Initiates a gift card purchase
 */
export async function handlePurchaseGiftCard(
  request: Request,
  context: GiftCardApiContext
): Promise<Response> {
  try {
    const body: GiftCardPurchaseRequest = await request.json();

    // Validate request
    const validation = validateGiftCardRequest(body);
    if (!validation.valid) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: validation.errors,
          },
        },
        400
      );
    }

    // Process purchase
    const result = await purchaseGiftCard(
      body,
      context.userId || null,
      context.db,
      context.payment,
      context.email
    );

    return jsonResponse(
      {
        success: true,
        data: {
          voucher_id: result.voucherId,
          voucher_code: result.voucherCode,
          amount: body.amount,
          currency: body.currency || 'EUR',
          expires_at: result.expiresAt,
          payment_intent_id: result.paymentIntentId,
          client_secret: result.clientSecret, // For Stripe/etc frontend integration
        },
      },
      201
    );
  } catch (error) {
    console.error('Error purchasing gift card:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred',
        },
      },
      500
    );
  }
}

/**
 * GET /api/vouchers/:code
 * Gets voucher details (balance check)
 */
export async function handleGetVoucher(
  request: Request,
  context: GiftCardApiContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const code = url.pathname.split('/').pop();

    if (!code) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Voucher code required',
          },
        },
        400
      );
    }

    const voucher = await context.db.findVoucherByCode(code.toUpperCase());

    if (!voucher) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'VOUCHER_NOT_FOUND',
            message: 'Voucher not found',
          },
        },
        404
      );
    }

    // Return limited info (don't expose full voucher details)
    return jsonResponse(
      {
        success: true,
        data: {
          code: voucher.code,
          remaining_amount: voucher.remaining_amount,
          currency: voucher.currency,
          expires_at: voucher.expires_at,
          is_active: voucher.is_active,
        },
      },
      200
    );
  } catch (error) {
    console.error('Error fetching voucher:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

/**
 * POST /api/webhooks/gift-card-payment-success
 * Webhook handler for successful gift card payment
 */
export async function handleGiftCardPaymentWebhook(
  request: Request,
  context: GiftCardApiContext
): Promise<Response> {
  try {
    const body = await request.json();
    const paymentIntentId = body.payment_intent_id || body.id;

    if (!paymentIntentId) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Payment intent ID required',
          },
        },
        400
      );
    }

    // Verify webhook signature (implement based on your payment provider)
    // await verifyWebhookSignature(request, context);

    await handleGiftCardPaymentSuccess(paymentIntentId, context.db, context.email);

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error('Error handling gift card payment webhook:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      500
    );
  }
}

function jsonResponse<T>(data: ApiResponse<T>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
