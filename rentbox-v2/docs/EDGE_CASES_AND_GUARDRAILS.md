# Rentbox v2 — Edge Cases & Guardrails

## Overview

This document catalogs known edge cases and the guardrails that handle them.
The system is designed to fail safe and preserve truth over convenience.

---

## 1. Booking Edge Cases

### 1.1 Race Condition: Two Users Book Same Slot

**Scenario**: Two users simultaneously try to book the same compartment for overlapping times.

**Guardrails**:
1. **First Line**: Redis distributed lock during booking creation
2. **Last Line**: PostgreSQL exclusion constraint (cannot be bypassed)

```sql
EXCLUDE USING gist (
  compartment_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (status NOT IN ('cancelled', 'expired'))
```

**Outcome**: One succeeds, one gets `SLOT_UNAVAILABLE` error with alternatives.

**Example Response**:
```json
{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This time slot was just booked by another customer.",
    "action": "Please select a different time.",
    "alternatives": [
      {
        "startAt": "2024-01-16T14:00:00+02:00",
        "endAt": "2024-01-16T22:00:00+02:00"
      }
    ]
  }
}
```

---

### 1.2 Pending Booking Expires Mid-Checkout

**Scenario**: User starts checkout, gets distracted, returns after 15 minutes.

**Guardrails**:
1. Frontend shows live countdown timer
2. Warning at 2 minutes remaining
3. Payment gateway validates booking status before charging
4. If expired, immediate feedback with option to re-create

**Implementation**:
```typescript
// In checkout service
async initiatePayment(bookingId: string) {
  const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (booking.status !== 'PENDING') {
    throw new ConflictException({
      code: 'BOOKING_EXPIRED',
      message: 'This booking has expired. Please create a new booking.',
      action: 'Start over with your booking.',
    });
  }
  
  if (booking.expiresAt && isAfter(new Date(), booking.expiresAt)) {
    // Auto-transition to EXPIRED
    await this.bookingService.transitionToExpired(bookingId);
    throw new ConflictException({ code: 'BOOKING_EXPIRED', ... });
  }
  
  // Proceed with payment
}
```

---

### 1.3 Extension Request Conflicts with Next Booking

**Scenario**: User tries to extend rental, but another booking starts soon after.

**Guardrails**:
1. Check availability before showing extension options
2. Offer maximum possible extension
3. Never allow overlapping bookings

**Example Response**:
```json
{
  "success": false,
  "error": {
    "code": "EXTENSION_BLOCKED",
    "message": "Cannot extend - another booking starts at 20:00.",
    "action": "Return by 18:00 or contact support for alternatives.",
    "details": {
      "maxExtensionUntil": "2024-01-16T19:30:00+02:00",
      "blockingBookingStarts": "2024-01-16T20:00:00+02:00"
    }
  }
}
```

---

### 1.4 DST Transition During Rental

**Scenario**: Rental spans a daylight saving time change (e.g., clocks go back 1 hour).

**Guardrails**:
1. All times stored as TIMESTAMPTZ (absolute moments in time)
2. Display uses user's timezone for rendering
3. Duration calculated from actual timestamps, not wall clock

**Example**:
```typescript
// User books 22:00-02:00 on night when clocks go back
const booking = {
  startAt: '2024-10-27T22:00:00+03:00', // Before change
  endAt: '2024-10-28T02:00:00+02:00',   // After change
};

// This is actually 5 hours duration (not 4)
const durationHours = differenceInHours(booking.endAt, booking.startAt); // 5

// Price calculated correctly
const price = calculatePrice(5, hourlyRate, dailyRate);
```

---

### 1.5 User Cancels During Active Rental

**Scenario**: User accidentally hits "cancel" when rental is ACTIVE.

**Guardrails**:
1. Cancel button hidden/disabled when status = ACTIVE
2. API rejects cancel requests for ACTIVE bookings
3. Clear error message guides user to "Return" action instead

**Implementation**:
```typescript
async cancelBooking(bookingId: string, userId: string) {
  const booking = await this.getBooking(bookingId);
  
  if (booking.status === 'ACTIVE') {
    throw new ConflictException({
      code: 'CANNOT_CANCEL_ACTIVE',
      message: 'Active rentals cannot be cancelled. Please return the item instead.',
      action: 'Use the "Return" button to end your rental.',
    });
  }
  
  // ... proceed with cancellation
}
```

---

## 2. Locker Access Edge Cases

### 2.1 Hardware Timeout During Open Request

**Scenario**: User clicks "Open", but locker doesn't respond in time.

**Guardrails**:
1. 5-second timeout on hardware commands
2. Auto-retry once internally
3. Fallback PIN offered immediately
4. Event logged with timeout details
5. Incident auto-created if pattern detected

**Example Response**:
```json
{
  "success": false,
  "code": "LOCKER_TIMEOUT",
  "message": "The locker didn't respond. Please try again.",
  "action": "Tap 'Try Again' or use the PIN code on the keypad.",
  "fallback": {
    "type": "PIN",
    "pin": "1234",
    "instructions": "Enter PIN 1234 on the locker keypad to open compartment #3."
  }
}
```

---

### 2.2 User Opens Locker Multiple Times Rapidly

**Scenario**: User spam-clicks open button causing multiple hardware commands.

**Guardrails**:
1. Frontend debounces clicks (500ms)
2. Backend tracks `accessAttempts` per booking
3. Max 3 app-based attempts before forcing PIN fallback
4. Redis rate limit: 1 request per 2 seconds per user

**Implementation**:
```typescript
// Rate limit check
const rateLimitKey = `locker:open:${userId}`;
const recent = await redis.get(rateLimitKey);
if (recent) {
  throw new TooManyRequestsException({
    code: 'RATE_LIMITED',
    message: 'Please wait a moment before trying again.',
    retryAfter: 2,
  });
}
await redis.setex(rateLimitKey, 2, '1');
```

---

### 2.3 Locker Opens But Door Sensor Fails

**Scenario**: Servo unlocks successfully but door sensor doesn't detect open state.

**Guardrails**:
1. Trust the unlock command success, not door state
2. Log discrepancy for technician review
3. User sees success, can proceed
4. Background job flags compartments with sensor issues

**Incident Auto-Creation**:
```typescript
if (unlockSuccess && !doorSensorOpen) {
  await this.incidentService.create({
    type: 'LOCKER_MALFUNCTION',
    severity: 'P3',
    title: `Door sensor mismatch: ${compartmentId}`,
    description: 'Unlock command succeeded but door sensor shows closed',
    compartmentId,
  });
}
```

---

### 2.4 User Accesses 1 Second Before Start Time

**Scenario**: Eager user tries to access at 09:59:59 for 10:00 booking.

**Guardrails**:
1. 15-minute early access window built into validation
2. Clear messaging about when access becomes available

**Implementation**:
```typescript
const earlyAccessMinutes = 15;
const earlyAccessTime = addMinutes(booking.startAt, -earlyAccessMinutes);

if (isBefore(now, earlyAccessTime)) {
  throw new ForbiddenException({
    code: 'TOO_EARLY',
    message: `Your rental starts at ${formatTime(booking.startAt)}. Access available 15 minutes before.`,
    details: {
      accessAvailableAt: earlyAccessTime.toISOString(),
      waitSeconds: differenceInSeconds(earlyAccessTime, now),
    },
  });
}
```

---

## 3. Payment Edge Cases

### 3.1 Payment Webhook Arrives Before Frontend Redirect

**Scenario**: Stripe webhook confirms payment faster than user returns to site.

**Guardrails**:
1. Idempotent webhook handling
2. Status check on frontend load
3. No duplicate booking confirmations

**Implementation**:
```typescript
async handleStripeWebhook(event: Stripe.Event) {
  const idempotencyKey = `webhook:${event.id}`;
  
  if (await redis.exists(idempotencyKey)) {
    return { received: true, processed: false, reason: 'duplicate' };
  }
  
  await redis.setex(idempotencyKey, 86400 * 7, '1'); // 7 day retention
  
  // Process payment...
}
```

---

### 3.2 Payment Succeeds But Booking Expired

**Scenario**: Payment takes slightly too long, booking expires mid-transaction.

**Guardrails**:
1. Final status check after payment success
2. Auto-refund if booking expired
3. Clear communication to user

**Implementation**:
```typescript
async confirmPayment(bookingId: string, paymentId: string) {
  const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
  
  if (booking.status === 'EXPIRED') {
    // Auto-refund
    await this.paymentService.refund(paymentId, 'Booking expired during payment');
    
    throw new ConflictException({
      code: 'BOOKING_EXPIRED_PAYMENT_REFUNDED',
      message: 'Your booking expired, but your payment has been automatically refunded.',
      action: 'Please create a new booking. Your refund will appear in 5-10 business days.',
      details: { refundId: refund.id },
    });
  }
  
  // Proceed with confirmation...
}
```

---

### 3.3 Card Declined After Contract Signed

**Scenario**: User signs contract, then card payment fails.

**Guardrails**:
1. Contract signing doesn't constitute agreement until payment
2. Signed contract stored but marked as "pending_payment"
3. User can retry payment or use different card
4. Contract expires with booking TTL

---

## 4. Return Edge Cases

### 4.1 User Reports Return But Door Didn't Close

**Scenario**: User clicks "Return" but walks away without closing compartment.

**Guardrails**:
1. Return status set to `PENDING_VERIFICATION`
2. No deposit release until door closed OR admin verification
3. Notification sent if door open >5 minutes after return initiated
4. Admin dashboard shows open compartments

---

### 4.2 Item Returned Damaged

**Scenario**: Admin inspection finds damage during verification.

**Guardrails**:
1. Return record captures condition
2. Photo evidence attached
3. Deposit held for damage claim
4. Incident created automatically
5. User notified with dispute process info

**Damage Assessment Flow**:
```typescript
async verifyReturn(returnId: string, assessment: DamageAssessment) {
  if (assessment.condition === 'DAMAGED' || assessment.condition === 'MISSING_PARTS') {
    // Hold deposit
    await this.depositService.holdForDamage(returnId, assessment.estimatedCost);
    
    // Create incident
    await this.incidentService.create({
      type: 'TOOL_DAMAGED',
      severity: 'P3',
      title: `Damage reported: ${booking.product.name}`,
      description: assessment.notes,
      bookingId: booking.id,
    });
    
    // Notify user
    await this.notificationService.send(booking.userId, 'DAMAGE_CLAIM', {
      productName: booking.product.name,
      damageDescription: assessment.notes,
      estimatedCost: assessment.estimatedCost,
      disputeUrl: `/support/dispute/${returnId}`,
    });
  }
}
```

---

### 4.3 72+ Hours Overdue

**Scenario**: User doesn't return item for 3+ days.

**Guardrails**:
1. Escalating notification cadence
2. P1 incident created at 24 hours
3. Emergency contact notified at 48 hours
4. Legal hold on deposit at 72 hours
5. Potential law enforcement escalation documented

**Escalation Timeline**:
```
End time + 30min: Status → OVERDUE, first warning
End time + 2h: Second warning, late fee accruing
End time + 6h: Third warning, "urgent" flag
End time + 24h: P1 incident created, admin notified
End time + 48h: Emergency contact called (if provided)
End time + 72h: Full deposit claimed, legal process initiated
```

---

## 5. Notification Edge Cases

### 5.1 Email Bounces

**Scenario**: User's email bounces consistently.

**Guardrails**:
1. Track bounce rate per user
2. After 3 bounces, mark email as invalid
3. Send critical notifications via SMS fallback
4. Prompt user to update email on next login

---

### 5.2 SMS During Quiet Hours

**Scenario**: Overdue warning triggers at 2 AM.

**Guardrails**:
1. Non-critical SMS queued until quiet hours end
2. P1 incidents override quiet hours
3. Email still sent immediately

**Implementation**:
```typescript
async sendNotification(userId: string, type: NotificationType, channel: Channel) {
  const prefs = await this.getPreferences(userId);
  
  if (channel === 'SMS' && prefs.quietHours?.enabled) {
    const now = new Date();
    const inQuietHours = this.isInQuietHours(now, prefs.quietHours);
    
    if (inQuietHours && type !== 'P1_CRITICAL') {
      // Queue for later
      const sendAt = this.getQuietHoursEnd(prefs.quietHours);
      await this.queue.add('send-sms', { userId, type }, { delay: sendAt - now });
      return;
    }
  }
  
  // Send immediately
}
```

---

## 6. System Edge Cases

### 6.1 Database Connection Lost

**Scenario**: PostgreSQL connection drops during booking creation.

**Guardrails**:
1. Transaction rollback (nothing committed)
2. Connection pool auto-reconnects
3. User sees transient error with retry option
4. No orphaned data

---

### 6.2 Redis Unavailable

**Scenario**: Redis cache/lock service is down.

**Guardrails**:
1. Graceful degradation: skip caching, log warnings
2. For critical locks (booking), fall back to database advisory locks
3. Monitor alerts trigger

**Fallback Lock**:
```typescript
async acquireLockWithFallback(key: string, ttl: number): Promise<() => void> {
  try {
    // Try Redis first
    if (await this.redis.acquireLock(key, ttl)) {
      return () => this.redis.releaseLock(key);
    }
  } catch (error) {
    this.logger.warn('Redis unavailable, using database lock');
  }
  
  // Fallback to PostgreSQL advisory lock
  const lockId = this.hashToInt(key);
  await this.prisma.$executeRaw`SELECT pg_advisory_lock(${lockId})`;
  return () => this.prisma.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;
}
```

---

### 6.3 Third-Party Service Down (Stripe, Twilio)

**Scenario**: Payment provider or SMS service experiences outage.

**Guardrails**:
1. Circuit breaker pattern
2. Queue non-critical operations for retry
3. Fallback providers where available
4. Clear user messaging

**Circuit Breaker**:
```typescript
const stripeCircuitBreaker = new CircuitBreaker(stripe.paymentIntents.create, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

stripeCircuitBreaker.on('open', () => {
  logger.error('Stripe circuit breaker OPEN - payments unavailable');
  alerting.trigger('PAYMENT_SERVICE_DOWN');
});
```

---

## 7. Security Edge Cases

### 7.1 User Tries to Access Another User's Booking

**Scenario**: Malicious user guesses booking ID.

**Guardrails**:
1. UUIDs make guessing impractical
2. All endpoints verify `booking.userId === currentUser.id`
3. Rate limiting on booking lookups
4. Security incident logged

---

### 7.2 Replay Attack on Payment Webhook

**Scenario**: Attacker replays a valid Stripe webhook.

**Guardrails**:
1. Stripe webhook signature verification
2. Idempotency key prevents reprocessing
3. Timestamp validation (reject old events)

```typescript
async handleWebhook(payload: string, signature: string) {
  // Verify signature
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  // Check timestamp (reject if >5 minutes old)
  const eventTime = event.created * 1000;
  if (Date.now() - eventTime > 5 * 60 * 1000) {
    throw new BadRequestException('Event too old');
  }
  
  // Check idempotency
  // ...
}
```

---

## 8. Data Integrity Guardrails

### Never-Delete Principle

These entities are **never** hard-deleted:
- `bookings` (soft-delete via status)
- `payments` (immutable record)
- `contracts` (legal requirement)
- `audit_logs` (compliance)
- `incidents` (soft-delete via `archived_at`)
- `locker_events` (operational history)

### Immutability Rules

Once set, these fields cannot be changed:
- `booking.booking_number`
- `contract.content_hash`
- `contract.signed_at`
- `payment.provider_payment_id`
- `audit_log.*` (entire record)

### Consistency Checks

Daily job validates:
1. All ACTIVE bookings have valid compartment assignments
2. All COMPLETED bookings have return records
3. All payments sum to booking totals
4. No orphaned records
5. Exclusion constraint integrity

---

## Summary

The system is designed with these principles:

1. **Truth over convenience**: Database constraints are truth; UI is suggestion
2. **Fail safe**: When uncertain, deny access and alert
3. **Audit everything**: Every decision is logged
4. **Clear communication**: Users always know what happened and what to do next
5. **Defense in depth**: Multiple validation layers, never just one
6. **Graceful degradation**: Partial functionality better than total failure
