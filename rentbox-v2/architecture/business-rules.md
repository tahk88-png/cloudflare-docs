# Business Rules, Edge Cases, and Guardrails

Comprehensive documentation of all business logic, edge case handling, and system guardrails that ensure Rentbox v2 operates reliably and predictably.

## Core Business Rules

### Rule 1: Time-Based Availability (NOT Stock-Based)

**Rule:** A compartment is either available or unavailable for a specific time range. There is no concept of "stock" or "quantity."

**Rationale:** Physical reality - one compartment cannot hold two tools simultaneously.

**Implementation:**
```sql
-- Database constraint prevents overlaps
EXCLUDE USING GIST (
  compartment_id WITH =,
  tstzrange(start_at, end_at) WITH &&
) WHERE (status NOT IN ('cancelled', 'expired'))
```

**Edge Cases:**

**Case: Adjacent bookings**
```
Booking A: 10:00 - 12:00
Booking B: 12:00 - 14:00
✅ ALLOWED: End of A = Start of B (no overlap)
```

**Case: Microsecond overlap**
```
Booking A: 10:00:00.000 - 12:00:00.000
Booking B: 11:59:59.999 - 14:00:00.000
❌ REJECTED: Even 1ms overlap is forbidden
```

**Case: Same-second booking attempt**
```
Two users click "Book" at exactly the same second for same slot
→ First transaction commits = SUCCESS
→ Second transaction = CONSTRAINT VIOLATION (409 error)
→ Show "Time slot no longer available" + suggest next slot
```

---

### Rule 2: Pending Booking TTL (15 Minutes)

**Rule:** Unpaid bookings expire after 15 minutes to prevent indefinite holds.

**Rationale:** Prevents malicious users from blocking compartments without paying.

**Implementation:**
```typescript
// Cron job runs every minute
const expireThreshold = subMinutes(new Date(), 15);

await db.bookings.updateMany({
  where: {
    status: 'pending',
    created_at: { lt: expireThreshold }
  },
  data: {
    status: 'expired',
    expired_at: new Date()
  }
});
```

**Edge Cases:**

**Case: Payment arrives after expiration**
```
User completes payment at T+14:59 but webhook arrives at T+15:01
→ Check booking status in webhook handler
→ If EXPIRED: Auto-refund + notify user
→ Log incident for investigation
```

**Case: User opens two tabs, tries to pay twice**
```
Tab 1: Initiates payment at T+10:00
Tab 2: Initiates payment at T+14:00
→ Tab 1 payment succeeds at T+10:30 (status → PAID)
→ Tab 2 payment link now invalid (booking no longer PENDING)
→ Payment provider rejects second attempt
```

**Case: Slow payment provider**
```
Payment stuck in "processing" for 20 minutes
→ Booking expires while payment pending
→ Webhook finally arrives: Booking status = EXPIRED
→ Auto-refund + customer notification with apology credit
```

---

### Rule 3: No Retroactive Bookings

**Rule:** `start_at` must be in the future (minimum 15 minutes from now).

**Rationale:** Prevents edge cases with immediate access and gives system time to prepare.

**Implementation:**
```typescript
const MIN_ADVANCE_BOOKING = 15; // minutes

function validateBookingTime(start_at: Date): void {
  const now = new Date();
  const minStart = addMinutes(now, MIN_ADVANCE_BOOKING);
  
  if (start_at < minStart) {
    throw new Error(
      `Booking must start at least ${MIN_ADVANCE_BOOKING} minutes from now. ` +
      `Earliest available: ${minStart.toISOString()}`
    );
  }
}
```

**Edge Cases:**

**Case: User in different timezone**
```
User in UTC+8, server in UTC+2
User selects "2:00 PM today" (their time)
→ Convert to server time
→ Validate against server's "now"
→ Display error in user's local time
```

**Case: Clock skew between client and server**
```
Client clock is 5 minutes ahead
User thinks they're booking 20 minutes ahead
But server sees it as 15 minutes ahead (at the limit)
→ Server validation is source of truth
→ Show clear error message with server's current time
```

---

### Rule 4: Maximum Booking Duration (30 Days)

**Rule:** No single booking can exceed 30 consecutive days.

**Rationale:** 
- Ensures tools circulate
- Prevents indefinite holds
- Maintenance windows can be scheduled

**Implementation:**
```typescript
const MAX_BOOKING_DAYS = 30;

function validateBookingDuration(start_at: Date, end_at: Date): void {
  const durationDays = differenceInDays(end_at, start_at);
  
  if (durationDays > MAX_BOOKING_DAYS) {
    throw new Error(
      `Maximum booking duration is ${MAX_BOOKING_DAYS} days. ` +
      `Your booking is ${durationDays} days. ` +
      `Please split into multiple bookings or contact support for long-term rental.`
    );
  }
}
```

**Alternatives for Long-Term Needs:**
- Multiple consecutive bookings
- B2B contract (bypasses limits)
- Subscription model (future feature)

**Edge Cases:**

**Case: Extension would exceed 30 days**
```
Initial booking: 20 days
User requests 15-day extension
Total would be 35 days
→ REJECT extension
→ Suggest: "Maximum extension: 10 days" or "Create new booking"
```

---

### Rule 5: Overdue Fees = 2× Hourly Rate

**Rule:** Late returns are charged at double the hourly rate.

**Rationale:** 
- Incentivizes on-time returns
- Compensates for lost rental opportunity
- Not punitive, just compensatory

**Implementation:**
```typescript
function calculateOverdueFees(booking: Booking): number {
  if (!booking.actual_end_at || booking.actual_end_at <= booking.end_at) {
    return 0;
  }
  
  const overdueHours = Math.ceil(
    differenceInHours(booking.actual_end_at, booking.end_at)
  );
  
  const overdueRate = booking.price_per_hour * 2;
  
  return overdueHours * overdueRate;
}
```

**Edge Cases:**

**Case: Return exactly at end time**
```
end_at: 14:00:00
actual_end_at: 14:00:00
→ overdueHours = 0
→ overdueFees = 0 ✅
```

**Case: Return 1 second late**
```
end_at: 14:00:00
actual_end_at: 14:00:01
→ overdueHours = Math.ceil(0.000277...) = 1
→ overdueFees = 1h × rate × 2 ❌

FIX: Add grace period
```

**Grace Period (5 Minutes):**
```typescript
const GRACE_PERIOD_MINUTES = 5;

function calculateOverdueFees(booking: Booking): number {
  if (!booking.actual_end_at) return 0;
  
  const graceEnd = addMinutes(booking.end_at, GRACE_PERIOD_MINUTES);
  
  if (booking.actual_end_at <= graceEnd) {
    return 0; // Within grace period
  }
  
  const overdueHours = Math.ceil(
    differenceInHours(booking.actual_end_at, graceEnd)
  );
  
  return overdueHours * booking.price_per_hour * 2;
}
```

---

### Rule 6: Deposit Refund After Verification

**Rule:** Deposits are held until tool return is verified (auto or manual).

**Rationale:** Protection against damage/loss.

**Auto-Verification Criteria:**
```typescript
function shouldAutoVerify(booking: Booking, user: User): boolean {
  return (
    // Good user history
    user.successful_rentals >= 5 &&
    user.incident_count === 0 &&
    user.dispute_count === 0 &&
    
    // Rental characteristics
    booking.status !== 'overdue' &&
    booking.deposit_amount <= 5000 && // ≤50 EUR
    booking.duration_hours <= 24 &&
    
    // No red flags
    !booking.return_photos || booking.return_photos.length === 0
  );
}
```

**Edge Cases:**

**Case: First-time user**
```
successful_rentals = 0
→ Auto-verify = FALSE
→ Manual review required (SLA: 24h)
→ Notify user: "Your deposit will be refunded within 1-2 business days after verification"
```

**Case: User uploads damage photos**
```
User uploads photos showing damage
→ Auto-verify = FALSE
→ High-priority manual review
→ Admin investigates: Pre-existing or new damage?
```

**Case: Overdue return**
```
Even if user has perfect history
If status = OVERDUE
→ Auto-verify = FALSE
→ Verify overdue fees calculated correctly
→ Check tool condition
```

---

### Rule 7: Payment Before Access

**Rule:** Compartment access is only granted after payment is confirmed.

**Rationale:** Trust but verify. Physical access = monetary commitment.

**Implementation:**
```typescript
async function openCompartment(bookingId: string): Promise<void> {
  const booking = await getBooking(bookingId);
  
  // Check payment
  if (booking.payment?.status !== 'completed') {
    throw new Error('Payment not completed. Please complete payment first.');
  }
  
  // Check timing
  const now = new Date();
  if (now < booking.start_at) {
    const minutesUntil = differenceInMinutes(booking.start_at, now);
    throw new Error(`Access not yet available. Available in ${minutesUntil} minutes.`);
  }
  
  if (now > addMinutes(booking.end_at, 15)) {
    throw new Error('Rental period has ended. Please contact support.');
  }
  
  // Check booking status
  if (!['paid', 'active'].includes(booking.status)) {
    throw new Error(`Cannot access compartment. Booking status: ${booking.status}`);
  }
  
  // Grant access
  await lockerService.open(booking.compartment_id);
}
```

**Edge Cases:**

**Case: Payment webhook delayed**
```
User pays at 10:00
Webhook arrives at 10:05
User tries to access at 10:02
→ Status still PENDING
→ Error: "Payment processing, please wait"
→ Retry button with exponential backoff
```

**Case: Early arrival**
```
Booking starts at 14:00
User arrives at 13:55
Tries to open compartment
→ Error: "Access available in 5 minutes"
→ Option: Request early access (if previous booking ended)
```

---

### Rule 8: Signature Required Before Payment

**Rule:** User must sign rental agreement before payment is processed.

**Rationale:** Legal compliance, terms acceptance.

**Implementation:**
```typescript
async function createPayment(bookingId: string): Promise<Payment> {
  const booking = await getBooking(bookingId);
  
  // Check signature exists
  const agreement = await getRentalAgreement(bookingId);
  if (!agreement || !agreement.is_valid) {
    throw new Error('Rental agreement must be signed before payment.');
  }
  
  // Check agreement is recent (not from old booking)
  if (agreement.signed_at < booking.created_at) {
    throw new Error('Please sign the rental agreement again.');
  }
  
  // Proceed with payment
  return await paymentService.create({
    booking_id: bookingId,
    amount: booking.total_due
  });
}
```

**Signature Type Selection:**
```typescript
function determineRequiredSignatureType(booking: Booking, user: User): SignatureType {
  // High-value rentals require strong auth
  if (booking.total_due > 50000) { // >500 EUR
    return 'smart_id'; // or 'mobile_id'
  }
  
  // Long-term rentals require strong auth
  if (booking.duration_days > 7) {
    return 'smart_id';
  }
  
  // Business customers require strong auth
  if (user.is_business) {
    return 'id_card';
  }
  
  // Default: typed signature
  return 'typed';
}
```

---

## Edge Cases & Handling

### Concurrent Operations

#### Case: Simultaneous Booking Attempts
**Scenario:** 100 users try to book the same time slot simultaneously.

**Handling:**
```typescript
// Use database transaction with SERIALIZABLE isolation
await db.$transaction(async (tx) => {
  // Check availability (with row lock)
  const conflicts = await tx.bookings.findMany({
    where: {
      compartment_id: data.compartment_id,
      start_at: { lt: data.end_at },
      end_at: { gt: data.start_at },
      status: { notIn: ['cancelled', 'expired'] }
    },
    lock: 'FOR UPDATE' // PostgreSQL row lock
  });
  
  if (conflicts.length > 0) {
    throw new ConflictError('Time slot no longer available');
  }
  
  // Create booking
  return await tx.bookings.create({ data });
}, {
  isolationLevel: 'Serializable',
  timeout: 5000 // 5 second timeout
});
```

**Result:**
- First transaction commits = SUCCESS
- Other 99 transactions = CONFLICT ERROR
- Users get immediate feedback + next available slot

---

#### Case: Extend While Overdue Check Running
**Scenario:** User requests extension while cron job is transitioning booking to OVERDUE.

**Handling:**
```typescript
// Use optimistic locking
async function extendBooking(bookingId: string, newEndAt: Date) {
  const booking = await getBooking(bookingId);
  
  // Check if booking is still in valid state
  if (!['paid', 'active'].includes(booking.status)) {
    throw new Error(`Cannot extend booking with status: ${booking.status}`);
  }
  
  // Update with version check
  const updated = await db.bookings.updateMany({
    where: {
      id: bookingId,
      lock_version: booking.lock_version, // Must match current version
      status: { in: ['paid', 'active'] }
    },
    data: {
      end_at: newEndAt,
      lock_version: { increment: 1 }
    }
  });
  
  // If no rows updated = concurrent modification
  if (updated.count === 0) {
    throw new ConcurrentModificationError('Booking was modified. Please refresh and try again.');
  }
  
  return await getBooking(bookingId);
}
```

---

### Hardware Failures

#### Case: Locker Offline During Active Rental
**Scenario:** Locker loses power/connectivity while customer has active booking.

**Handling:**
```typescript
// 1. Monitor detects offline status
if (locker.last_ping_at < subMinutes(now(), 30)) {
  // 2. Create P1 incident
  const incident = await createIncident({
    severity: 'p1',
    type: 'hardware_failure',
    subtype: 'locker_offline',
    locker_id: locker.id
  });
  
  // 3. Find affected bookings
  const affected = await getActiveBookings(locker.id);
  
  // 4. Notify customers
  for (const booking of affected) {
    await sendNotification({
      user_id: booking.user_id,
      channel: 'sms',
      template: 'locker_offline',
      data: {
        booking_number: booking.booking_number,
        locker_code: locker.code,
        support_phone: '+372 5551 2345',
        incident_id: incident.incident_number
      }
    });
  }
  
  // 5. Offer alternatives
  // - Nearby locker (if available)
  // - Manual access via support call
  // - Full refund + compensation
}
```

**Customer Communication:**
```
Subject: Urgent: Locker Maintenance - Alternative Access

Your rental (BK-2024-001234) is affected by temporary 
maintenance at locker L-001.

Don't worry - we've got you covered:

Option 1: Use nearby locker L-002 (50m away)
- New compartment: C-12
- New PIN: 5678

Option 2: Call us for manual access
- Phone: +372 5551 2345
- Quote: INC-2024-001234

Option 3: Cancel with full refund + 100% credit

We apologize for the inconvenience.
```

---

#### Case: Compartment Won't Open
**Scenario:** Customer tries to access compartment but lock mechanism fails.

**Handling:**
```typescript
async function handleLockFailure(booking: Booking, error: LockError) {
  // 1. Log access failure
  await logAccessAttempt({
    booking_id: booking.id,
    compartment_id: booking.compartment_id,
    action: 'open_failed',
    error_code: error.code,
    error_message: error.message
  });
  
  // 2. Retry with exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    await sleep(Math.pow(2, attempt) * 1000); // 2s, 4s, 8s
    
    try {
      await lockerService.open(booking.compartment_id);
      return { success: true };
    } catch (retryError) {
      if (attempt === 3) break;
    }
  }
  
  // 3. All retries failed - create incident
  const incident = await createIncident({
    severity: 'p0',
    type: 'hardware_failure',
    subtype: 'compartment_malfunction',
    compartment_id: booking.compartment_id,
    booking_id: booking.id,
    description: `Customer unable to access compartment. Error: ${error.message}`
  });
  
  // 4. Immediate customer support
  await initiateEmergencySupport({
    booking_id: booking.id,
    user_id: booking.user_id,
    incident_id: incident.id,
    issue: 'lock_failure'
  });
  
  // 5. Offer alternatives
  return {
    success: false,
    error: 'Unable to open compartment',
    actions: [
      { type: 'call_support', phone: '+372 5551 2345' },
      { type: 'use_alternate', compartment_id: 'C-XX' },
      { type: 'full_refund' }
    ],
    incident_id: incident.incident_number
  };
}
```

---

### Payment Edge Cases

#### Case: Partial Payment (Card Decline)
**Scenario:** Payment provider authorizes but then declines capture.

**Handling:**
```typescript
// Webhook: payment.failed
async function handlePaymentFailed(event: PaymentFailedEvent) {
  const booking = await getBooking(event.booking_id);
  
  // 1. Update booking status
  await updateBooking(booking.id, {
    status: 'pending', // Back to pending
    payment_failure_count: booking.payment_failure_count + 1
  });
  
  // 2. Notify customer
  await sendNotification({
    user_id: booking.user_id,
    channel: 'email',
    template: 'payment_failed',
    data: {
      booking_number: booking.booking_number,
      reason: event.failure_reason,
      retry_url: `${APP_URL}/bookings/${booking.id}/pay`
    }
  });
  
  // 3. If too many failures, release booking
  if (booking.payment_failure_count >= 3) {
    await updateBooking(booking.id, { status: 'expired' });
    await sendNotification({
      user_id: booking.user_id,
      template: 'booking_expired_payment_failures'
    });
  }
}
```

---

#### Case: Double Refund Request
**Scenario:** Customer cancels, then calls support claiming refund not received.

**Protection:**
```typescript
async function processRefund(bookingId: string): Promise<Refund> {
  const booking = await getBooking(bookingId);
  const payment = await getPayment(booking.id);
  
  // Check if already refunded
  if (payment.refunded_amount > 0) {
    return await getRefund(payment.id); // Return existing refund
  }
  
  // Use idempotency key
  const idempotencyKey = `refund-${booking.id}-${payment.id}`;
  
  const refund = await paymentProvider.refund({
    payment_id: payment.provider_transaction_id,
    amount: payment.amount - payment.refunded_amount,
    idempotency_key: idempotencyKey
  });
  
  // Update our records
  await updatePayment(payment.id, {
    refunded_amount: refund.amount,
    status: 'refunded'
  });
  
  return refund;
}
```

---

### User Behavior Edge Cases

#### Case: User Never Shows Up
**Scenario:** Booking transitions to ACTIVE but user never accesses compartment.

**Handling:**
```typescript
// Check if booking is active but never accessed
const activeBookings = await db.bookings.findMany({
  where: {
    status: 'active',
    start_at: { lt: subHours(now(), 2) },
    actual_start_at: null // Never accessed
  }
});

for (const booking of activeBookings) {
  // Send reminder
  await sendNotification({
    user_id: booking.user_id,
    channel: 'sms',
    template: 'rental_not_started',
    data: {
      booking_number: booking.booking_number,
      access_pin: booking.pickup_pin,
      locker_location: booking.location.name
    }
  });
}

// If still not accessed by end time
if (now() > booking.end_at && !booking.actual_start_at) {
  await updateBooking(booking.id, {
    status: 'completed', // Auto-complete
    actual_start_at: booking.start_at,
    actual_end_at: booking.end_at,
    admin_notes: 'Auto-completed: User never accessed compartment'
  });
  
  // Offer refund/credit as goodwill
  await createRefund({
    booking_id: booking.id,
    amount: booking.total_rental_cost * 0.5, // 50% refund
    reason: 'unused_rental'
  });
}
```

---

#### Case: User Reports Tool Missing from Compartment
**Scenario:** Customer opens compartment but tool is not inside.

**Handling:**
```typescript
// User clicks "Tool is missing" button in app
async function reportMissingTool(bookingId: string) {
  const booking = await getBooking(bookingId);
  
  // 1. Create P0 incident immediately
  const incident = await createIncident({
    severity: 'p0',
    type: 'tool_missing',
    booking_id: booking.id,
    compartment_id: booking.compartment_id,
    description: `Customer reports tool missing from compartment ${booking.compartment.number}`
  });
  
  // 2. Check last booking for this compartment
  const previousBooking = await getPreviousBooking(booking.compartment_id);
  
  if (previousBooking && !previousBooking.actual_end_at) {
    // Previous customer never returned!
    await linkIncident(incident.id, previousBooking.id);
  }
  
  // 3. Immediate customer care
  await initiateEmergencyCall({
    booking_id: booking.id,
    user_id: booking.user_id,
    priority: 'urgent'
  });
  
  // 4. Automatic actions
  await Promise.all([
    // Cancel current booking with full refund
    cancelBooking(booking.id, { reason: 'tool_missing', full_refund: true }),
    
    // Mark compartment as damaged
    updateCompartment(booking.compartment_id, { status: 'damaged' }),
    
    // Block future bookings
    createMaintenanceBlock({
      compartment_id: booking.compartment_id,
      start_at: now(),
      end_at: addDays(now(), 7),
      reason: 'Tool missing - investigation'
    }),
    
    // Alert ops team
    sendAlert({
      channel: 'slack',
      message: `🚨 URGENT: Tool missing from ${booking.location.name} - ${booking.compartment.number}`,
      incident_id: incident.incident_number
    })
  ]);
  
  // 5. Offer alternatives
  return {
    refund_issued: true,
    alternative_bookings: await findAlternatives(booking),
    compensation: {
      credit_amount: booking.total_due, // 100% credit
      apology_message: 'We sincerely apologize. This should never happen.'
    }
  };
}
```

---

## Guardrails Summary

### Database-Level Guardrails
1. ✅ Exclusion constraint prevents double bookings
2. ✅ Check constraints ensure valid data
3. ✅ Foreign keys maintain referential integrity
4. ✅ Unique constraints prevent duplicates
5. ✅ Triggers log all state changes

### Application-Level Guardrails
1. ✅ Idempotency keys prevent duplicate operations
2. ✅ Optimistic locking prevents race conditions
3. ✅ Transaction isolation prevents conflicts
4. ✅ Rate limiting prevents abuse
5. ✅ Input validation (Zod schemas)

### Business-Level Guardrails
1. ✅ TTL expires unpaid bookings
2. ✅ Overdue detection and auto-fees
3. ✅ Signature required before payment
4. ✅ Payment required before access
5. ✅ Verification required before refund

### Operational Guardrails
1. ✅ Auto-incident creation for anomalies
2. ✅ SLA tracking and escalation
3. ✅ Customer communication at every step
4. ✅ Fallback mechanisms for hardware failures
5. ✅ Comprehensive audit logging

---

## Testing Edge Cases

### Unit Tests
```typescript
describe('Booking Validation', () => {
  it('rejects retroactive bookings', () => {
    const pastTime = subMinutes(new Date(), 5);
    expect(() => validateBookingTime(pastTime)).toThrow();
  });
  
  it('allows minimum advance booking', () => {
    const futureTime = addMinutes(new Date(), 15);
    expect(() => validateBookingTime(futureTime)).not.toThrow();
  });
  
  it('calculates overdue fees correctly with grace period', () => {
    const booking = {
      end_at: new Date('2024-12-27T14:00:00Z'),
      actual_end_at: new Date('2024-12-27T14:04:00Z'),
      price_per_hour: 500
    };
    expect(calculateOverdueFees(booking)).toBe(0); // Within grace
  });
});
```

### Integration Tests
```typescript
describe('Concurrent Booking Prevention', () => {
  it('prevents double booking under high load', async () => {
    const attempts = Array(100).fill(null).map(() =>
      createBooking({
        compartment_id: 'same-compartment',
        start_at: '2024-12-27T10:00:00Z',
        end_at: '2024-12-27T14:00:00Z'
      }).catch(e => e)
    );
    
    const results = await Promise.all(attempts);
    const successes = results.filter(r => r.id);
    const failures = results.filter(r => r instanceof Error);
    
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(99);
  });
});
```

---

**These guardrails ensure:**
- No double bookings under any condition
- Predictable behavior in edge cases
- Graceful degradation during failures
- Clear error messages and next actions
- Full audit trail for disputes
- Customer protection and satisfaction
