# Booking Lifecycle State Machine

The booking entity transitions through well-defined states from creation to completion. Every transition is logged and auditable.

## State Diagram

```
                    ┌─────────────┐
                    │   PENDING   │ ◄─── Initial state after creation
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                │          │          │
                │    (payment)   (15min timeout)
                │          │          │
                ▼          ▼          ▼
         ┌──────────┐  ┌──────┐  ┌─────────┐
         │ EXPIRED  │  │ PAID │  │CANCELLED│
         └──────────┘  └───┬──┘  └─────────┘
                           │
                    (start_at reached)
                           │
                           ▼
                       ┌────────┐
                       │ ACTIVE │ ◄─── Tool in customer possession
                       └───┬────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      (on-time return) (past end_at) (cancel)
            │              │              │
            ▼              ▼              ▼
       ┌──────────┐   ┌─────────┐   ┌─────────┐
       │COMPLETED │   │ OVERDUE │   │CANCELLED│
       └──────────┘   └────┬────┘   └─────────┘
                           │
                    (eventually returned)
                           │
                           ▼
                      ┌──────────┐
                      │COMPLETED │
                      └──────────┘
```

## States

### 1. PENDING
**Initial state when booking is created.**

**Characteristics:**
- Payment not yet received
- Compartment is **soft-locked** (reserved but not confirmed)
- Has TTL (Time To Live): 15 minutes default
- After TTL expires → auto-transition to EXPIRED

**Allowed Actions:**
- Pay (→ PAID)
- Cancel (→ CANCELLED)

**System Actions:**
- TTL monitor job checks every 1 minute
- Auto-expire if `created_at + 15 minutes < NOW()`

**Example:**
```json
{
  "id": "uuid",
  "status": "pending",
  "created_at": "2024-12-26T10:30:00Z",
  "expires_at": "2024-12-26T10:45:00Z",
  "payment": null
}
```

---

### 2. EXPIRED
**Booking was created but not paid within TTL.**

**Characteristics:**
- Terminal state (no further transitions)
- Compartment lock released
- No refund (nothing was paid)

**Database cleanup:**
- Row remains for analytics
- Excluded from availability checks via exclusion constraint

**Example:**
```json
{
  "id": "uuid",
  "status": "expired",
  "created_at": "2024-12-26T10:30:00Z",
  "expires_at": "2024-12-26T10:45:00Z",
  "expired_at": "2024-12-26T10:45:01Z"
}
```

---

### 3. PAID
**Payment received, waiting for start time.**

**Characteristics:**
- Compartment is **hard-locked** (confirmed reservation)
- Access codes generated (pickup_pin)
- Customer can see countdown to start time
- Cannot be cancelled without refund process

**Allowed Actions:**
- Cancel (→ CANCELLED, triggers refund)
- System auto-transition at `start_at` (→ ACTIVE)

**System Actions:**
- Monitor job checks every 1 minute
- At `NOW() >= start_at`: transition to ACTIVE
- Send "Your rental starts in 1 hour" notification
- Send "Your rental has started" notification

**Example:**
```json
{
  "id": "uuid",
  "status": "paid",
  "start_at": "2024-12-27T10:00:00Z",
  "end_at": "2024-12-27T14:00:00Z",
  "pickup_pin": "1234",
  "return_pin": "5678",
  "pin_expires_at": "2024-12-27T14:15:00Z",
  "payment": {
    "status": "completed",
    "amount": 12000,
    "paid_at": "2024-12-26T10:32:00Z"
  }
}
```

---

### 4. ACTIVE
**Rental is currently in progress.**

**Characteristics:**
- Customer has access to compartment
- Pickup PIN is valid
- Return PIN is valid
- Real-time countdown to `end_at`
- Can transition to OVERDUE if not returned on time

**Allowed Actions:**
- Open compartment (pickup/return)
- Extend rental (if next slot available)
- Initiate return (→ COMPLETED)

**System Actions:**
- Monitor job checks every 5 minutes
- At `NOW() > end_at`: transition to OVERDUE
- Send "Return in 2 hours" notification
- Send "Return in 30 minutes" notification
- Track `actual_start_at` when first access occurs

**Example:**
```json
{
  "id": "uuid",
  "status": "active",
  "start_at": "2024-12-27T10:00:00Z",
  "end_at": "2024-12-27T14:00:00Z",
  "actual_start_at": "2024-12-27T10:05:23Z",
  "actual_end_at": null,
  "time_remaining_seconds": 12345
}
```

---

### 5. OVERDUE
**Rental end time passed, tool not returned.**

**Characteristics:**
- Customer still has physical access (must return tool)
- Overdue fees accruing
- High-priority notifications sent
- May trigger incident creation

**Allowed Actions:**
- Initiate return (→ COMPLETED with overdue fees)
- Admin force-complete

**System Actions:**
- Calculate overdue fees: `floor((NOW() - end_at) / 1 hour) × hourly_rate × 2`
- Send overdue notifications at +15min, +1h, +4h, +24h
- At +48h: Create P1 incident
- At +72h: Escalate to P0 incident + contact authorities

**Example:**
```json
{
  "id": "uuid",
  "status": "overdue",
  "start_at": "2024-12-27T10:00:00Z",
  "end_at": "2024-12-27T14:00:00Z",
  "actual_start_at": "2024-12-27T10:05:23Z",
  "actual_end_at": null,
  "overdue_hours": 3,
  "overdue_fees": 3000,
  "last_notification_sent": "2024-12-27T17:00:00Z"
}
```

---

### 6. COMPLETED
**Rental successfully completed.**

**Characteristics:**
- Terminal state (no further transitions)
- Tool returned to compartment
- All fees calculated and charged
- Deposit refund processed
- Invoice generated

**Characteristics:**
- `actual_end_at` recorded
- Return photos (optional)
- Condition notes
- May require admin verification

**Actions Disabled:**
- No further modifications
- Read-only for customer and admin

**Example:**
```json
{
  "id": "uuid",
  "status": "completed",
  "start_at": "2024-12-27T10:00:00Z",
  "end_at": "2024-12-27T14:00:00Z",
  "actual_start_at": "2024-12-27T10:05:23Z",
  "actual_end_at": "2024-12-27T13:55:17Z",
  "return_condition_notes": "Tool in excellent condition",
  "return_photos": ["url1", "url2"],
  "verified_at": "2024-12-27T14:05:00Z",
  "verified_by": "admin-uuid",
  "total_cost": 2000,
  "overdue_fees": 0,
  "damage_fees": 0,
  "deposit_refund": 10000,
  "invoice_id": "uuid"
}
```

---

### 7. CANCELLED
**Booking cancelled by user or admin.**

**Characteristics:**
- Can happen from PENDING, PAID, or ACTIVE
- Refund policy depends on when cancelled
- Compartment lock released
- Cannot be un-cancelled

**Refund Policy:**
- PENDING: 100% refund (nothing paid yet)
- PAID (>24h before start): 100% refund
- PAID (<24h before start): 50% refund
- ACTIVE: No refund + overdue fees apply

**Example:**
```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancelled_at": "2024-12-26T11:00:00Z",
  "cancelled_by": "user-uuid",
  "cancellation_reason": "Changed plans",
  "refund": {
    "amount": 12000,
    "percentage": 100,
    "status": "processing"
  }
}
```

---

## State Transition Rules

### Automatic Transitions (System-Driven)

| From | To | Trigger | Frequency |
|------|------|---------|-----------|
| PENDING | EXPIRED | `created_at + 15min < NOW()` | Every 1 minute |
| PAID | ACTIVE | `NOW() >= start_at` | Every 1 minute |
| ACTIVE | OVERDUE | `NOW() > end_at AND actual_end_at IS NULL` | Every 5 minutes |

**Implementation:**
```sql
-- Cron job runs every minute
UPDATE bookings
SET status = 'expired'
WHERE status = 'pending'
  AND created_at + INTERVAL '15 minutes' < NOW();

UPDATE bookings
SET status = 'active'
WHERE status = 'paid'
  AND start_at <= NOW();

UPDATE bookings
SET status = 'overdue'
WHERE status = 'active'
  AND end_at < NOW()
  AND actual_end_at IS NULL;
```

---

### Manual Transitions (User/Admin-Driven)

| From | To | Action | Who |
|------|------|--------|-----|
| PENDING | PAID | Payment completed | User |
| PENDING | CANCELLED | Cancel before payment | User |
| PAID | CANCELLED | Cancel after payment | User/Admin |
| ACTIVE | COMPLETED | Initiate return | User |
| OVERDUE | COMPLETED | Late return | User |
| ACTIVE | CANCELLED | Admin force-cancel | Admin only |

---

## Transition Guards

**Before transitioning, check:**

### PENDING → PAID
```typescript
async function canTransitionToPaid(booking: Booking): Promise<boolean> {
  // Check payment received
  const payment = await getPayment(booking.id);
  if (payment.status !== 'completed') return false;
  
  // Check not expired
  if (booking.expires_at < new Date()) return false;
  
  // Check compartment still available (paranoid check)
  const conflicts = await checkConflicts(
    booking.compartment_id,
    booking.start_at,
    booking.end_at
  );
  if (conflicts.length > 0) return false;
  
  return true;
}
```

### PAID → ACTIVE
```typescript
async function canTransitionToActive(booking: Booking): Promise<boolean> {
  // Check start time reached
  if (booking.start_at > new Date()) return false;
  
  // Check not cancelled
  if (booking.status === 'cancelled') return false;
  
  // Check locker online
  const locker = await getLocker(booking.compartment_id);
  if (locker.status === 'offline') {
    // Create incident, but still allow transition
    await createIncident({
      severity: 'p1',
      title: `Locker offline during active rental`,
      locker_id: locker.id,
      booking_id: booking.id
    });
  }
  
  return true;
}
```

### ACTIVE → COMPLETED
```typescript
async function canTransitionToCompleted(booking: Booking): Promise<boolean> {
  // Check tool returned to compartment
  const compartment = await getCompartment(booking.compartment_id);
  if (!compartment.is_locked) return false;
  
  // Check return confirmation received
  if (!booking.return_confirmed) return false;
  
  return true;
}
```

---

## Side Effects

### On PAID Transition
1. Generate access PINs
2. Send confirmation email/SMS
3. Create calendar event (ICS)
4. Schedule reminder notifications
5. Log in audit trail

### On ACTIVE Transition
1. Send "Your rental has started" notification
2. Enable compartment access
3. Start countdown timer
4. Schedule return reminders

### On OVERDUE Transition
1. Calculate overdue fees
2. Send urgent notifications (SMS + email)
3. Create incident if >48h overdue
4. Notify admins
5. Increase notification frequency

### On COMPLETED Transition
1. Lock compartment access
2. Calculate final costs
3. Process deposit refund
4. Generate invoice
5. Send completion email with receipt
6. Request rating/review
7. Offer "Rent again" discount

### On CANCELLED Transition
1. Release compartment lock
2. Process refund (if applicable)
3. Send cancellation confirmation
4. Cancel scheduled notifications
5. Make compartment available for rebooking

---

## Notification Schedule

### PAID State
- Immediately: "Booking confirmed"
- start_at - 24h: "Your rental is tomorrow"
- start_at - 1h: "Your rental starts in 1 hour"

### ACTIVE State
- Immediately: "Your rental has started"
- end_at - 2h: "Please return in 2 hours"
- end_at - 30min: "Please return in 30 minutes"

### OVERDUE State
- end_at + 15min: "Overdue: Please return immediately"
- end_at + 1h: "Overdue 1 hour - fees apply"
- end_at + 4h: "Urgent: Overdue 4 hours"
- end_at + 24h: "Critical: Contact support immediately"
- Every 12h after: Repeated reminders

### COMPLETED State
- Immediately: "Return confirmed - thank you!"
- +24h: "How was your rental? Leave a review"

---

## Edge Cases & Handling

### Case 1: Payment during expiration window
**Scenario:** User completes payment at T+14:59 (1 second before expiration)

**Handling:**
- Payment webhook arrives after expiration
- Check booking status
- If EXPIRED: Refund automatically, notify user
- If PENDING: Process normally

### Case 2: Locker offline when rental starts
**Scenario:** Booking transitions to ACTIVE but locker is offline

**Handling:**
- Allow transition to ACTIVE (booking truth matters)
- Create P1 incident immediately
- Send customer apology + fallback instructions
- Offer manual access or alternative locker
- Extend rental time to compensate

### Case 3: Customer extends during ACTIVE
**Scenario:** User requests extension at T+3h of 4h rental

**Handling:**
- Check next booking exists
- If clear: Allow extension, charge difference
- If conflict: Offer max extension to next booking start
- Process payment before updating `end_at`
- Update access PINs expiration

### Case 4: Admin force-completes OVERDUE booking
**Scenario:** Tool recovered, user unresponsive

**Handling:**
- Admin verifies tool in compartment
- Force transition to COMPLETED
- Charge full overdue fees
- Send final invoice
- Flag account for review

### Case 5: Double-return attempt
**Scenario:** User clicks "Return" twice (network lag)

**Handling:**
- Idempotency key prevents duplicate
- First request: Process return
- Second request: Return existing completion data
- No double refund

---

## Testing State Transitions

### Unit Test Example
```typescript
describe('Booking State Machine', () => {
  it('transitions from PENDING to EXPIRED after TTL', async () => {
    const booking = await createBooking({ /* ... */ });
    expect(booking.status).toBe('pending');
    
    // Fast-forward time
    await advanceTime(minutes(16));
    await runExpirationJob();
    
    const updated = await getBooking(booking.id);
    expect(updated.status).toBe('expired');
  });
  
  it('prevents transition to ACTIVE before start time', async () => {
    const booking = await createPaidBooking({
      start_at: futureTime(hours(2))
    });
    
    await expect(
      transitionToActive(booking.id)
    ).rejects.toThrow('Cannot start rental before scheduled time');
  });
  
  it('calculates overdue fees correctly', async () => {
    const booking = await createActiveBooking({
      end_at: pastTime(hours(3)),
      price_per_hour: 500
    });
    
    await runOverdueJob();
    const updated = await getBooking(booking.id);
    
    expect(updated.status).toBe('overdue');
    expect(updated.overdue_fees).toBe(3000); // 3h × 500 × 2
  });
});
```

---

## Monitoring & Alerts

### Key Metrics

**State distribution:**
```sql
SELECT status, COUNT(*) 
FROM bookings 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

**Average time in each state:**
```sql
SELECT 
  from_status,
  AVG(EXTRACT(EPOCH FROM (created_at - lag_created_at))) as avg_seconds
FROM booking_status_history
GROUP BY from_status;
```

### Alerts

**Critical (P0):**
- >5 bookings stuck in PENDING for >20min
- PAID → ACTIVE transition failing
- ACTIVE → OVERDUE rate >5%

**Warning (P1):**
- Average PENDING → PAID time >10min
- >10 OVERDUE bookings
- Expiration rate >20%

---

## Summary

**The booking state machine ensures:**
1. ✅ Clear, predictable lifecycle
2. ✅ Automatic transitions at correct times
3. ✅ Proper notification at each stage
4. ✅ Audit trail for all changes
5. ✅ Graceful handling of edge cases
6. ✅ No ambiguous states

**Every transition is:**
- Logged in `booking_status_history`
- Triggered by explicit event
- Guarded by validation rules
- Accompanied by side effects

**State machine is the source of truth for:**
- When customer can access compartment
- When fees apply
- When refunds are processed
- What actions are available
