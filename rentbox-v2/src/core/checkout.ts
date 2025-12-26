// ============================================================================
// Rentbox v2: Checkout Code Application Logic
// ============================================================================

import type {
  CodeApplicationRequest,
  CodeApplicationResult,
  DiscountCode,
  Voucher,
  Cart,
  DiscountType,
} from '../types';
import { evaluateCampaignRules, type EvaluationContext } from './campaign-engine';

export interface DatabaseAdapter {
  findDiscountByCode(code: string): Promise<DiscountCode | null>;
  findVoucherByCode(code: string): Promise<Voucher | null>;
  getUserDiscountUsage(userId: string, discountId: string): Promise<number>;
  getCampaignsForDiscount(discountId: string): Promise<Array<{ id: string; rules: unknown }>>;
  lockVoucherForUpdate(voucherId: string): Promise<Voucher | null>;
}

/**
 * Applies a discount or voucher code to a cart.
 * This is the PREVIEW step - no money is deducted yet.
 */
export async function applyCode(
  request: CodeApplicationRequest,
  db: DatabaseAdapter
): Promise<CodeApplicationResult> {
  const normalizedCode = request.code.trim().toUpperCase();

  // Try discount first, then voucher
  const discount = await db.findDiscountByCode(normalizedCode);
  if (discount) {
    return applyDiscount(discount, request, db);
  }

  const voucher = await db.findVoucherByCode(normalizedCode);
  if (voucher) {
    return applyVoucher(voucher, request, db);
  }

  return {
    success: false,
    type: null,
    error: {
      code: 'CODE_NOT_FOUND',
      message: 'Invalid code',
    },
  };
}

async function applyDiscount(
  discount: DiscountCode,
  request: CodeApplicationRequest,
  db: DatabaseAdapter
): Promise<CodeApplicationResult> {
  // Check if active
  if (!discount.is_active) {
    return {
      success: false,
      type: 'discount',
      error: {
        code: 'DISCOUNT_INACTIVE',
        message: 'This discount code is no longer active',
      },
    };
  }

  // Check validity dates
  const now = new Date();
  if (now < discount.valid_from) {
    return {
      success: false,
      type: 'discount',
      error: {
        code: 'DISCOUNT_NOT_YET_VALID',
        message: `This discount code becomes valid on ${discount.valid_from.toLocaleDateString()}`,
      },
    };
  }

  if (discount.valid_until && now > discount.valid_until) {
    return {
      success: false,
      type: 'discount',
      error: {
        code: 'DISCOUNT_EXPIRED',
        message: 'This discount code has expired',
      },
    };
  }

  // Check max uses
  if (discount.max_uses !== null && discount.used_count >= discount.max_uses) {
    return {
      success: false,
      type: 'discount',
      error: {
        code: 'DISCOUNT_EXHAUSTED',
        message: 'This discount code has reached its usage limit',
      },
    };
  }

  // Check min order amount
  if (discount.min_order_amount !== null && request.cart.subtotal < discount.min_order_amount) {
    return {
      success: false,
      type: 'discount',
      error: {
        code: 'MIN_ORDER_NOT_MET',
        message: `Minimum order value of €${(discount.min_order_amount / 100).toFixed(2)} required`,
      },
    };
  }

  // Check per-user limit
  if (request.user_id) {
    const userUsage = await db.getUserDiscountUsage(request.user_id, discount.id);
    // Assuming per-user limit is 1 unless specified otherwise
    // You might want to add a per_user_limit field to discount_codes
    if (userUsage > 0) {
      return {
        success: false,
        type: 'discount',
        error: {
          code: 'USER_LIMIT_EXCEEDED',
          message: 'You have already used this discount code',
        },
      };
    }
  }

  // Evaluate campaign rules
  const campaigns = await db.getCampaignsForDiscount(discount.id);
  for (const campaign of campaigns) {
    const evaluationContext: EvaluationContext = {
      cart: request.cart,
      user_id: request.user_id,
      booking_context: request.booking_context,
    };

    const result = evaluateCampaignRules(campaign.rules as any, evaluationContext);
    if (!result.valid) {
      return {
        success: false,
        type: 'discount',
        error: {
          code: 'CAMPAIGN_RULE_FAILED',
          message: result.reason || 'This discount code is not valid for your booking',
          reason: result.reason,
        },
      };
    }
  }

  // Calculate discount amount
  const discountAmount = calculateDiscountAmount(discount, request.cart);
  if (discountAmount <= 0) {
    return {
      success: false,
      type: 'discount',
      error: {
        code: 'DISCOUNT_NOT_APPLICABLE',
        message: 'Discount does not apply to this cart',
      },
    };
  }

  const newSubtotal = Math.max(0, request.cart.subtotal - discountAmount);
  const newTotal = newSubtotal + request.cart.deposit;

  return {
    success: true,
    type: 'discount',
    discount: {
      id: discount.id,
      code: discount.code,
      type: discount.type,
      discount_amount: discountAmount,
      new_subtotal: newSubtotal,
      new_total: newTotal,
    },
  };
}

async function applyVoucher(
  voucher: Voucher,
  request: CodeApplicationRequest,
  db: DatabaseAdapter
): Promise<CodeApplicationResult> {
  // Lock voucher for update (prevent race conditions)
  const lockedVoucher = await db.lockVoucherForUpdate(voucher.id);
  if (!lockedVoucher) {
    return {
      success: false,
      type: 'voucher',
      error: {
        code: 'VOUCHER_NOT_FOUND',
        message: 'Voucher not found',
      },
    };
  }

  // Check if active
  if (!lockedVoucher.is_active) {
    return {
      success: false,
      type: 'voucher',
      error: {
        code: 'VOUCHER_INACTIVE',
        message: 'This voucher is no longer active',
      },
    };
  }

  // Check expiry
  if (lockedVoucher.expires_at && new Date() > lockedVoucher.expires_at) {
    return {
      success: false,
      type: 'voucher',
      error: {
        code: 'VOUCHER_EXPIRED',
        message: 'This voucher has expired',
      },
    };
  }

  // Check balance
  if (lockedVoucher.remaining_amount <= 0) {
    return {
      success: false,
      type: 'voucher',
      error: {
        code: 'VOUCHER_EXHAUSTED',
        message: 'This voucher has no remaining balance',
      },
    };
  }

  // Calculate how much to apply
  // Vouchers can partially cover the order
  const applicableAmount = Math.min(lockedVoucher.remaining_amount, request.cart.subtotal);
  const newSubtotal = Math.max(0, request.cart.subtotal - applicableAmount);
  const newTotal = newSubtotal + request.cart.deposit;

  return {
    success: true,
    type: 'voucher',
    voucher: {
      id: lockedVoucher.id,
      code: lockedVoucher.code,
      applied_amount: applicableAmount,
      remaining_balance: lockedVoucher.remaining_amount - applicableAmount,
      new_subtotal: newSubtotal,
      new_total: newTotal,
    },
  };
}

function calculateDiscountAmount(discount: DiscountCode, cart: Cart): number {
  switch (discount.type) {
    case 'percentage': {
      // Value is 0-100 (e.g., 10 = 10%)
      const percentage = discount.value / 100;
      const amount = Math.floor(cart.subtotal * percentage);
      return Math.min(amount, cart.subtotal); // Never exceed subtotal
    }

    case 'fixed': {
      // Value is in cents
      return Math.min(discount.value, cart.subtotal);
    }

    case 'free_time': {
      // Value is in minutes
      // Calculate equivalent monetary value based on cart items
      // This is simplified - in production, you'd calculate based on hourly rates
      const totalMinutes = cart.items.reduce((sum, item) => sum + item.duration_minutes, 0);
      if (totalMinutes === 0) return 0;

      const freeMinutesValue = (discount.value / totalMinutes) * cart.subtotal;
      return Math.floor(Math.min(freeMinutesValue, cart.subtotal));
    }

    default:
      return 0;
  }
}

/**
 * Removes a code from the cart (for UI preview)
 */
export function removeCode(
  cart: Cart,
  appliedCode: { type: 'discount' | 'voucher'; amount: number }
): Cart {
  return {
    ...cart,
    subtotal: cart.subtotal + appliedCode.amount,
    total: cart.subtotal + appliedCode.amount + cart.deposit,
  };
}
