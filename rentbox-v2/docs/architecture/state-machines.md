# Rentbox v2 - State Machines

> All critical state transitions are documented here. State changes are auditable and irreversible (forward-only).

## 1. Booking State Machine

The booking is the central entity. Its state determines what actions are available.

### State Diagram

```
                                    ┌─────────────┐
                                    │   EXPIRED   │
                                    └──────▲──────┘
                                           │
                                           │ TTL timeout (15 min)
                                           │ no payment received
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
              ┌─────┴─────┐                                       │
    ────────▶ │  PENDING  │ ◀── Created with reserved slot        │
              └─────┬─────┘                                       │
                    │                                             │
                    │ Payment captured +                          │
                    │ Contract signed                             │
                    ▼                                             │
              ┌───────────┐                                       │
              │ CONFIRMED │ ─────────────────┐                    │
              └─────┬─────┘                  │                    │
                    │                        │                    │
                    │ start_at reached       │ User/Admin cancel  │
                    │ OR early pickup        │                    │
                    ▼                        ▼                    │
              ┌───────────┐           ┌───────────┐               │
              │  ACTIVE   │           │ CANCELLED │ ◀─────────────┘
              └─────┬─────┘           └───────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        │ Return    │ end_at    │ Never
        │ on time   │ passed    │ returned
        ▼           ▼           ▼
  ┌───────────┐ ┌───────────┐ ┌───────────┐
  │ COMPLETED │ │  OVERDUE  │ │ ESCALATED │
  └───────────┘ └─────┬─────┘ └───────────┘
                      │
                      │ Eventually returned
                      ▼
                ┌───────────┐
                │ COMPLETED │
                └───────────┘
```

### States

| State | Description | Entry Conditions | Exit Conditions |
|-------|-------------|------------------|-----------------|
| `pending` | Booking created, awaiting payment | Availability confirmed, slot reserved | Payment + signature → confirmed<br>TTL expires → expired<br>User cancels → cancelled |
| `confirmed` | Paid and ready for pickup | Payment captured, contract signed | start_at reached → active<br>User cancels (with refund rules) → cancelled |
| `active` | Tool is with customer | Time window started OR early pickup confirmed | Return confirmed → completed<br>end_at passed → overdue |
| `completed` | Successfully returned | Return confirmed, condition verified | Terminal state |
| `overdue` | Past end time, not returned | end_at passed while active | Return confirmed → completed<br>Escalation threshold → escalated |
| `cancelled` | Booking cancelled | User/admin cancellation | Terminal state |
| `expired` | Pending booking timed out | TTL reached without payment | Terminal state |

### Transitions

```typescript
// Valid state transitions
const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['active', 'cancelled'],
  active: ['completed', 'overdue'],
  overdue: ['completed'],
  completed: [],  // Terminal
  cancelled: [],  // Terminal
  expired: [],    // Terminal
};
```

### Transition Rules

#### pending → confirmed
```typescript
interface PendingToConfirmed {
  requires: {
    payment_captured: true;
    contract_signed: true;
  };
  actions: [
    'release_pending_lock',
    'confirm_compartment_reservation',
    'generate_access_token',
    'send_confirmation_notification',
    'schedule_start_reminder',
  ];
}
```

#### pending → expired
```typescript
interface PendingToExpired {
  trigger: 'TTL_TIMEOUT' | 'SYSTEM_SCHEDULED_JOB';
  ttl_minutes: 15;  // Configurable
  actions: [
    'release_pending_lock',
    'release_compartment_reservation',
    'log_expiration',
    // NO notification sent - user abandoned checkout
  ];
}
```

#### confirmed → active
```typescript
interface ConfirmedToActive {
  triggers: [
    { type: 'TIME_BASED', condition: 'NOW() >= start_at' },
    { type: 'MANUAL', condition: 'early_pickup_requested AND admin_approved' },
    { type: 'DOOR_EVENT', condition: 'compartment_door_opened' }
  ];
  actions: [
    'update_inventory_status_to_rented',
    'activate_access_token',
    'send_pickup_confirmation',
    'schedule_return_reminder',
  ];
}
```

#### confirmed → cancelled
```typescript
interface ConfirmedToCancelled {
  requires: {
    triggered_by: 'user' | 'admin' | 'system';
    reason: string;
  };
  refund_rules: {
    // Cancellation > 24h before: Full refund
    hours_before_24_plus: { refund_percent: 100 },
    // Cancellation 12-24h before: 50% refund
    hours_before_12_to_24: { refund_percent: 50 },
    // Cancellation < 12h before: No refund
    hours_before_0_to_12: { refund_percent: 0 },
  };
  actions: [
    'calculate_refund_amount',
    'process_refund',
    'release_compartment_reservation',
    'revoke_access_token',
    'send_cancellation_notification',
  ];
}
```

#### active → completed
```typescript
interface ActiveToCompleted {
  requires: {
    door_closed_after_return: true;
    // OR admin_confirmed_return: true
  };
  actions: [
    'record_return_timestamp',
    'revoke_access_token',
    'update_inventory_status_to_available',
    'schedule_deposit_release',
    'update_inventory_stats',
    'send_return_confirmation',
    'request_review',
  ];
}
```

#### active → overdue
```typescript
interface ActiveToOverdue {
  trigger: 'SCHEDULED_JOB';  // Runs every 5 minutes
  condition: 'NOW() > end_at + grace_period';
  grace_period_minutes: 30;
  actions: [
    'calculate_overdue_charges',
    'send_overdue_notification',
    'alert_operations_team',
    'start_overdue_charge_accumulation',
  ];
  escalation: {
    threshold_hours: 24;
    action: 'create_incident';
  };
}
```

---

## 2. Payment State Machine

```
              ┌───────────┐
    ────────▶ │  PENDING  │
              └─────┬─────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        │ Card      │ Bank      │ Failed
        ▼           ▼           ▼
  ┌────────────┐ ┌───────────┐ ┌────────┐
  │ AUTHORIZED │ │ PENDING   │ │ FAILED │
  │  (hold)    │ │ (bank)    │ └────────┘
  └─────┬──────┘ └─────┬─────┘
        │              │
        │ Capture      │ Confirmed
        ▼              ▼
  ┌───────────────────────┐
  │       CAPTURED        │
  └───────────┬───────────┘
              │
              │ Refund requested
              ▼
  ┌───────────────────────┐
  │  REFUNDED / PARTIAL   │
  └───────────────────────┘
```

### States

| State | Description |
|-------|-------------|
| `pending` | Payment initiated, awaiting processing |
| `authorized` | Card authorized, funds held (not captured) |
| `captured` | Funds transferred |
| `failed` | Payment failed |
| `refunded` | Full refund processed |
| `partially_refunded` | Partial refund processed |

---

## 3. Deposit State Machine

```
              ┌───────────┐
    ────────▶ │  PENDING  │
              └─────┬─────┘
                    │
                    │ Payment authorized
                    ▼
              ┌───────────┐
              │   HELD    │ ◀── Funds held on card
              └─────┬─────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        │ Clean     │ Damage/   │ Dispute
        │ return    │ Issue     │ opened
        ▼           ▼           ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ RELEASED │ │ CAPTURED │ │ DISPUTED │
  │ (refund) │ │ (kept)   │ │ (frozen) │
  └──────────┘ └──────────┘ └────┬─────┘
                                 │
                                 │ Resolution
                                 ▼
                     ┌───────────────────┐
                     │ RELEASED/CAPTURED │
                     └───────────────────┘
```

### Business Rules

```typescript
const DEPOSIT_RULES = {
  // Hold period after return before auto-release
  hold_after_return_hours: 24,
  
  // Auto-release if no issues reported within hold period
  auto_release: true,
  
  // Capture scenarios
  capture_triggers: [
    'damage_confirmed_by_admin',
    'tool_not_returned_48h',
    'customer_admits_damage',
  ],
  
  // Partial capture allowed
  partial_capture_allowed: true,
};
```

---

## 4. Compartment State Machine

```
              ┌─────────────┐
              │  AVAILABLE  │ ◀── Default state
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        │ Booking    │ Admin      │ Maintenance
        │ created    │ block      │ scheduled
        ▼            ▼            ▼
  ┌──────────┐ ┌───────────┐ ┌─────────────┐
  │ RESERVED │ │  BLOCKED  │ │ MAINTENANCE │
  └────┬─────┘ └───────────┘ └──────┬──────┘
       │                            │
       │ Pickup                     │ Completed
       │ confirmed                  │
       ▼                            │
  ┌──────────┐                      │
  │ OCCUPIED │ ──────────────────▶ ─┘
  └────┬─────┘
       │
       │ Return confirmed
       ▼
  ┌─────────────┐
  │  AVAILABLE  │
  └─────────────┘
```

### States

| State | Description | Physical State |
|-------|-------------|----------------|
| `available` | Ready for booking | May or may not contain tool |
| `reserved` | Booked for future rental | Contains tool |
| `occupied` | Currently rented | Tool removed by customer |
| `blocked` | Manually blocked by admin | N/A |
| `maintenance` | Under maintenance | May be open/disassembled |

---

## 5. Locker Door State Machine

```
              ┌────────────┐
              │   CLOSED   │ ◀── Normal state
              └──────┬─────┘
                     │
                     │ Open command received
                     │ AND access validated
                     ▼
              ┌────────────┐
              │  OPENING   │ ◀── Hardware command sent
              └──────┬─────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        │ Success    │ Timeout    │ Hardware error
        ▼            ▼            ▼
  ┌────────────┐ ┌────────────┐ ┌───────────┐
  │    OPEN    │ │   STUCK    │ │   ERROR   │
  └──────┬─────┘ └────────────┘ └───────────┘
         │
         │ Door sensor detects close
         │ OR timeout (60s)
         ▼
  ┌────────────┐
  │  CLOSING   │
  └──────┬─────┘
         │
         │ Confirmed closed
         ▼
  ┌────────────┐
  │   CLOSED   │
  └────────────┘
```

### Door Events (Logged)

```typescript
type DoorEvent = 
  | 'door_open_requested'    // User/system requested open
  | 'door_open_authorized'   // Access validated
  | 'door_open_denied'       // Access rejected
  | 'door_opening'           // Hardware command sent
  | 'door_opened'            // Sensor confirms open
  | 'door_open_failed'       // Hardware error
  | 'door_open_timeout'      // Open command timed out
  | 'door_closing'           // Auto-close or manual
  | 'door_closed'            // Sensor confirms closed
  | 'door_left_open_warning' // Open too long
  | 'door_forced_open'       // Tamper detection
  ;
```

---

## 6. Incident State Machine

```
              ┌────────────┐
    ────────▶ │    OPEN    │
              └──────┬─────┘
                     │
                     │ Assigned to operator
                     ▼
              ┌───────────────┐
              │ INVESTIGATING │
              └───────┬───────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          │ Waiting   │ Fix       │ Cannot
          │ for user  │ applied   │ resolve
          ▼           ▼           ▼
  ┌───────────────┐ ┌──────────┐ ┌───────────┐
  │PENDING_ACTION │ │ RESOLVED │ │ ESCALATED │
  └───────┬───────┘ └────┬─────┘ └───────────┘
          │              │
          │ User         │ Admin
          │ responds     │ closes
          ▼              ▼
  ┌───────────────┐ ┌──────────┐
  │ INVESTIGATING │ │  CLOSED  │
  └───────────────┘ └──────────┘
```

### Severity Levels

| Level | Response Time | Examples |
|-------|---------------|----------|
| `critical` | 15 minutes | Customer locked out with active booking, safety issue |
| `high` | 1 hour | Locker offline, payment mismatch |
| `medium` | 4 hours | Tool damage reported, customer complaint |
| `low` | 24 hours | Minor cosmetic damage, feature request |

---

## 7. Notification State Machine

```
              ┌───────────┐
    ────────▶ │  PENDING  │
              └─────┬─────┘
                    │
                    │ Queued for delivery
                    ▼
              ┌───────────┐
              │  QUEUED   │
              └─────┬─────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        │ Delivered │ Failed    │ Bounced
        ▼           ▼           ▼
  ┌───────────┐ ┌────────┐ ┌─────────┐
  │ DELIVERED │ │ FAILED │ │ BOUNCED │
  └───────────┘ └────┬───┘ └─────────┘
                     │
                     │ Retry (max 3)
                     ▼
              ┌───────────┐
              │  QUEUED   │ (back to queue)
              └───────────┘
```

### Retry Policy

```typescript
const NOTIFICATION_RETRY = {
  max_attempts: 3,
  backoff: 'exponential',
  delays_seconds: [60, 300, 900],  // 1min, 5min, 15min
  
  // Give up after final failure
  on_final_failure: 'log_and_alert',
};
```

---

## State Transition Logging

Every state transition is logged immutably:

```typescript
interface StateTransition {
  id: string;
  entity_type: 'booking' | 'payment' | 'compartment' | 'incident';
  entity_id: string;
  from_state: string | null;  // null for initial state
  to_state: string;
  triggered_by: 'user' | 'system' | 'admin' | 'payment' | 'locker' | 'scheduled';
  user_id?: string;
  reason?: string;
  metadata: Record<string, unknown>;
  created_at: Date;  // timestamptz
}
```

### Example Log Entry

```json
{
  "id": "trans_abc123",
  "entity_type": "booking",
  "entity_id": "book_xyz789",
  "from_state": "pending",
  "to_state": "confirmed",
  "triggered_by": "payment",
  "user_id": "usr_abc123",
  "reason": "Payment captured successfully",
  "metadata": {
    "payment_id": "pay_def456",
    "amount": "68.00",
    "contract_hash": "sha256:abc123..."
  },
  "created_at": "2024-01-15T10:36:00.000Z"
}
```

---

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `expire_pending_bookings` | Every 1 min | Move pending bookings past TTL to expired |
| `activate_confirmed_bookings` | Every 5 min | Move confirmed bookings past start_at to active |
| `detect_overdue_bookings` | Every 5 min | Move active bookings past end_at to overdue |
| `send_start_reminders` | Every 15 min | Send reminders for bookings starting soon |
| `send_return_reminders` | Every 15 min | Send reminders for bookings ending soon |
| `escalate_overdue` | Every 1 hour | Create incidents for long-overdue bookings |
| `release_deposits` | Every 1 hour | Auto-release deposits after hold period |
| `cleanup_expired_access_tokens` | Every 1 hour | Revoke expired access tokens |
