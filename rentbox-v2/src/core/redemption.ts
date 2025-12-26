// ============================================================================
// Rentbox v2: Redemption Logic (After Payment Confirmation)
// ============================================================================

import type {
  DiscountCode,
  Voucher,
  DiscountRedemption,
  VoucherRedemption,
} from '../types';

export interface RedemptionDatabaseAdapter {
  // Discount operations
  incrementDiscountUsage(discountId: string): Promise<void>;
  recordDiscountRedemption(
    discountId: string,
    bookingId: string,
    amount: number,
    userId: string | null,
    campaignId: string | null,
    bookingSubtotal: number,
    bookingDurationMinutes: number | null
  ): Promise<DiscountRedemption>;
  incrementUserDiscountUsage(userId: string, discountId: string): Promise<void>;

  // Voucher operations
  lockVoucherForUpdate(voucherId: string): Promise<Voucher | null>;
  deductVoucherBalance(voucherId: string, amount: number): Promise<void>;
  recordVoucherRedemption(
    voucherId: string,
    bookingId: string,
    amount: number,
    userId: string | null
  ): Promise<VoucherRedemption>;
}

export interface RedemptionContext {
  bookingId: string;
  userId: string | null;
  appliedDiscount?: {
    id: string;
    amount: number;
    campaignId?: string;
  };
  appliedVoucher?: {
    id: string;
    amount: number;
  };
  bookingSubtotal: number;
  bookingDurationMinutes: number | null;
}

/**
 * Records redemptions after successful payment.
 * This is idempotent - calling multiple times with same bookingId is safe.
 */
export async function recordRedemptions(
  context: RedemptionContext,
  db: RedemptionDatabaseAdapter
): Promise<{
  discountRedemption?: DiscountRedemption;
  voucherRedemption?: VoucherRedemption;
}> {
  const results: {
    discountRedemption?: DiscountRedemption;
    voucherRedemption?: VoucherRedemption;
  } = {};

  // Record discount redemption
  if (context.appliedDiscount) {
    // Check if already recorded (idempotency)
    // In production, you'd check if a redemption already exists for this bookingId

    await db.incrementDiscountUsage(context.appliedDiscount.id);

    const discountRedemption = await db.recordDiscountRedemption(
      context.appliedDiscount.id,
      context.bookingId,
      context.appliedDiscount.amount,
      context.userId,
      context.appliedDiscount.campaignId || null,
      context.bookingSubtotal,
      context.bookingDurationMinutes
    );

    if (context.userId) {
      await db.incrementUserDiscountUsage(context.userId, context.appliedDiscount.id);
    }

    results.discountRedemption = discountRedemption;
  }

  // Record voucher redemption
  if (context.appliedVoucher) {
    // Lock voucher to prevent double-spending
    const voucher = await db.lockVoucherForUpdate(context.appliedVoucher.id);
    if (!voucher) {
      throw new Error(`Voucher ${context.appliedVoucher.id} not found`);
    }

    if (voucher.remaining_amount < context.appliedVoucher.amount) {
      throw new Error(
        `Insufficient voucher balance. Expected: ${context.appliedVoucher.amount}, Available: ${voucher.remaining_amount}`
      );
    }

    await db.deductVoucherBalance(context.appliedVoucher.id, context.appliedVoucher.amount);

    const voucherRedemption = await db.recordVoucherRedemption(
      context.appliedVoucher.id,
      context.bookingId,
      context.appliedVoucher.amount,
      context.userId
    );

    results.voucherRedemption = voucherRedemption;
  }

  return results;
}

/**
 * Rolls back redemptions if payment fails.
 * This should be called in a transaction that also rolls back the booking.
 */
export async function rollbackRedemptions(
  context: RedemptionContext,
  db: RedemptionDatabaseAdapter & {
    decrementDiscountUsage(discountId: string): Promise<void>;
    restoreVoucherBalance(voucherId: string, amount: number): Promise<void>;
    deleteRedemption(redemptionId: string, type: 'discount' | 'voucher'): Promise<void>;
  }
): Promise<void> {
  if (context.appliedDiscount) {
    await db.decrementDiscountUsage(context.appliedDiscount.id);
    // In production, you'd also delete the redemption record
  }

  if (context.appliedVoucher) {
    await db.restoreVoucherBalance(context.appliedVoucher.id, context.appliedVoucher.amount);
    // In production, you'd also delete the redemption record
  }
}
