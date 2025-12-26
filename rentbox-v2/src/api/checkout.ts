// ============================================================================
// Rentbox v2: Checkout API Endpoints
// ============================================================================

import type {
  CodeApplicationRequest,
  CodeApplicationResult,
  ApiResponse,
} from '../types';
import { applyCode, removeCode } from '../core/checkout';

export interface CheckoutApiContext {
  db: any; // DatabaseAdapter from checkout.ts
  userId?: string;
  rateLimiter?: {
    checkLimit(key: string): Promise<boolean>;
  };
}

/**
 * POST /api/checkout/apply-code
 * Applies a discount or voucher code to the cart (preview only)
 */
export async function handleApplyCode(
  request: Request,
  context: CheckoutApiContext
): Promise<Response> {
  try {
    // Rate limiting
    if (context.rateLimiter) {
      const clientId = request.headers.get('x-client-id') || 'anonymous';
      const canProceed = await context.rateLimiter.checkLimit(`apply-code:${clientId}`);
      if (!canProceed) {
        return jsonResponse(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
            },
          },
          429
        );
      }
    }

    const body: CodeApplicationRequest = await request.json();

    // Validate request
    if (!body.code || !body.cart) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: code, cart',
          },
        },
        400
      );
    }

    // Apply code
    const result = await applyCode(
      {
        ...body,
        user_id: context.userId || body.user_id,
      },
      context.db
    );

    return jsonResponse({ success: true, data: result }, 200);
  } catch (error) {
    console.error('Error applying code:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while applying the code',
          details: error instanceof Error ? error.message : String(error),
        },
      },
      500
    );
  }
}

/**
 * POST /api/checkout/remove-code
 * Removes a code from the cart (for UI preview)
 */
export async function handleRemoveCode(
  request: Request,
  context: CheckoutApiContext
): Promise<Response> {
  try {
    const body: { cart: any; appliedCode: { type: 'discount' | 'voucher'; amount: number } } =
      await request.json();

    if (!body.cart || !body.appliedCode) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: cart, appliedCode',
          },
        },
        400
      );
    }

    const updatedCart = removeCode(body.cart, body.appliedCode);

    return jsonResponse({ success: true, data: { cart: updatedCart } }, 200);
  } catch (error) {
    console.error('Error removing code:', error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while removing the code',
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
