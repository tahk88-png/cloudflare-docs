# Edge Cases & Handling Notes

## Concurrent Voucher Redemptions

**Problem:** Multiple users trying to redeem the same voucher simultaneously.

**Solution:**
- Use PostgreSQL `SELECT ... FOR UPDATE` row-level locking
- Lock voucher row during redemption check and balance deduction
- Transaction ensures atomicity

**Implementation:**
```typescript
// In checkout.ts - applyVoucher()
const lockedVoucher = await db.lockVoucherForUpdate(voucher.id);

// In redemption.ts - recordRedemptions()
const voucher = await db.lockVoucherForUpdate(context.appliedVoucher.id);
if (voucher.remaining_amount < context.appliedVoucher.amount) {
  throw new Error('Insufficient balance');
}
```

## Idempotent Checkout Confirmation

**Problem:** Payment webhook may fire multiple times, causing double redemption.

**Solution:**
- Check if redemption already exists for booking_id before recording
- Use database unique constraint on (voucher_id, booking_id) or (discount_code_id, booking_id)
- Return existing redemption if already processed

**Implementation:**
```sql
-- Add unique constraint
ALTER TABLE voucher_redemptions 
ADD CONSTRAINT unique_voucher_booking UNIQUE (voucher_id, booking_id);

ALTER TABLE discount_redemptions 
ADD CONSTRAINT unique_discount_booking UNIQUE (discount_code_id, booking_id);
```

## Partial Voucher Redemption

**Problem:** Voucher balance (€50) is less than cart total (€75).

**Solution:**
- Apply maximum possible amount (€50)
- User pays remaining balance (€25) with other payment method
- Voucher balance reduced to €0, voucher remains active but exhausted

**Implementation:**
```typescript
// In checkout.ts
const applicableAmount = Math.min(
  lockedVoucher.remaining_amount,
  request.cart.subtotal
);
```

## Discount Code Expiry During Checkout

**Problem:** User applies code, code expires before payment completes.

**Solution:**
- Re-validate code at payment confirmation time
- If expired, reject payment and show error
- User must re-apply valid code

**Implementation:**
```typescript
// In payment confirmation handler
const discount = await db.findDiscountByCode(code);
if (!discount || !isDiscountValid(discount)) {
  throw new Error('Discount code expired');
}
```

## Campaign Rule Changes

**Problem:** Campaign rules change while user has code applied.

**Solution:**
- Re-evaluate campaign rules at payment confirmation
- If rules changed and code no longer valid, reject payment
- Log rule changes in audit log

## Voucher Code Collision

**Problem:** Generated voucher code already exists.

**Solution:**
- Database function `generate_voucher_code()` retries until unique
- Uses case-insensitive check
- Excludes confusing characters (0, O, I, 1)

**Implementation:**
```sql
-- In migration
CREATE FUNCTION generate_voucher_code(...)
RETURNS VARCHAR AS $$
DECLARE
  result VARCHAR;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate code
    -- Check if exists
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN result;
END;
```

## Negative Totals Prevention

**Problem:** Discount amount exceeds cart subtotal.

**Solution:**
- Always cap discount at cart subtotal
- Never allow negative subtotal
- Deposit always remains separate

**Implementation:**
```typescript
const discountAmount = calculateDiscountAmount(discount, cart);
const newSubtotal = Math.max(0, cart.subtotal - discountAmount);
```

## Expired Voucher Write-Off

**Problem:** Vouchers expire with remaining balance.

**Solution:**
- Track expired vouchers in liability report
- Optionally write off to breakage income (check local regulations)
- Provide admin tool to manually extend expiry if needed

**Accounting:**
```typescript
// In accounting.ts
getExpiredVoucherWriteOffEntries(amount)
// Debit: Unearned Revenue - Gift Cards
// Credit: Other Income - Gift Card Breakage
```

## Stackable Discounts

**Problem:** Multiple discounts applied simultaneously.

**Solution:**
- `is_stackable` flag controls behavior
- Default: false (only one discount per order)
- If stackable, apply in order (first discount, then second, etc.)
- Always respect max discount = subtotal

**Implementation:**
```typescript
// In checkout.ts
if (!discount.is_stackable && cartHasAppliedDiscount(cart)) {
  return { error: 'Cannot stack discounts' };
}
```

## Per-User Discount Limits

**Problem:** User tries to use same discount code multiple times.

**Solution:**
- Track usage in `user_discount_usage` table
- Check per-user limit before applying
- Default limit: 1 use per user per discount

**Implementation:**
```typescript
const userUsage = await db.getUserDiscountUsage(userId, discountId);
if (userUsage > 0) {
  return { error: 'Already used this discount' };
}
```

## Free Time Discount Calculation

**Problem:** "Free 1 hour" discount needs monetary equivalent.

**Solution:**
- Calculate based on cart items' hourly rates
- If cart has mixed durations, prorate proportionally
- Example: 2h rental = €20, free 1h = €10 discount

**Implementation:**
```typescript
case 'free_time': {
  const totalMinutes = cart.items.reduce(
    (sum, item) => sum + item.duration_minutes, 0
  );
  const freeMinutesValue = (discount.value / totalMinutes) * cart.subtotal;
  return Math.floor(Math.min(freeMinutesValue, cart.subtotal));
}
```

## Timezone Handling

**Problem:** Campaign time windows need correct timezone.

**Solution:**
- Store timezone in campaign rules
- Convert server time to campaign timezone for evaluation
- Use libraries like `date-fns-tz` for accurate conversion

**Implementation:**
```typescript
const localTime = new Date(
  now.toLocaleString('en-US', { timeZone: timezone })
);
```

## Payment Failure Rollback

**Problem:** Payment fails after redemption recorded.

**Solution:**
- Use database transactions
- Rollback redemption if payment fails
- Restore discount usage count and voucher balance

**Implementation:**
```typescript
try {
  await recordRedemptions(context, db);
  await processPayment(...);
} catch (error) {
  await rollbackRedemptions(context, db);
  throw error;
}
```

## Case-Insensitive Code Matching

**Problem:** User enters "summer2024" but code is "SUMMER2024".

**Solution:**
- Normalize all codes to uppercase
- Use case-insensitive database queries
- Index on UPPER(code) for performance

**Implementation:**
```sql
CREATE INDEX idx_discount_codes_code ON discount_codes(UPPER(code));

SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($1);
```

## Rate Limiting

**Problem:** Brute force code guessing attacks.

**Solution:**
- Rate limit code application attempts per IP/user
- Use Redis or in-memory rate limiter
- Return 429 Too Many Requests

**Implementation:**
```typescript
const canProceed = await rateLimiter.checkLimit(`apply-code:${clientId}`);
if (!canProceed) {
  return { error: 'Rate limit exceeded' };
}
```
