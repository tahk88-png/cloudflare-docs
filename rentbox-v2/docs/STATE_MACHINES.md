# Rentbox v2 — State Machines & Business Logic

## Overview

This document defines the state machines that govern core business entities.
All state transitions are logged for auditability.

---

## 1. Booking State Machine

The booking is the core entity. Its state determines what actions are available.

### States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BOOKING STATES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   PENDING ────────────────┬──────────────────────────────► EXPIRED      │
│      │                    │ (TTL)                                        │
│      │ payment_confirmed  │                                              │
│      ▼                    │                                              │
│   PAID ───────────────────┤                                              │
│      │                    │ user_cancelled                               │
│      │ rental_started     │                                              │
│      ▼                    ▼                                              │
│   ACTIVE ───────────────────────────────────────────────► CANCELLED     │
│      │                                                                   │
│      ├──── end_time_passed ──────► OVERDUE                              │
│      │                                │                                  │
│      │ item_returned                  │ item_returned                    │
│      ▼                                ▼                                  │
│   COMPLETED ◄────────────────────────────                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### State Definitions

| State | Description | Entry Conditions | Exit Conditions |
|-------|-------------|------------------|-----------------|
| `PENDING` | Awaiting payment | Booking created | Payment confirmed OR TTL expired OR Cancelled |
| `PAID` | Payment received, not yet started | Payment confirmed | Rental period starts OR Cancelled |
| `ACTIVE` | Rental in progress | Start time reached AND status=PAID | Item returned OR End time passed |
| `COMPLETED` | Successfully returned | Item returned | Terminal state |
| `OVERDUE` | Past end_at, not returned | End time + grace period passed | Item returned |
| `CANCELLED` | User or system cancelled | User action OR Admin action | Terminal state |
| `EXPIRED` | PENDING TTL expired | TTL elapsed without payment | Terminal state |

### Transitions

```typescript
interface BookingTransition {
  from: BookingStatus;
  to: BookingStatus;
  trigger: string;
  guard?: () => boolean;
  action?: () => void;
}

const bookingTransitions: BookingTransition[] = [
  // PENDING transitions
  {
    from: 'PENDING',
    to: 'PAID',
    trigger: 'payment_confirmed',
    guard: () => !isExpired() && paymentValid(),
    action: () => {
      clearExpirationTTL();
      sendConfirmationEmail();
      scheduleStartReminder();
    },
  },
  {
    from: 'PENDING',
    to: 'EXPIRED',
    trigger: 'ttl_elapsed',
    guard: () => isPastExpiration(),
    action: () => {
      releaseCompartmentHold();
      logExpiration();
    },
  },
  {
    from: 'PENDING',
    to: 'CANCELLED',
    trigger: 'user_cancelled',
    action: () => {
      releaseCompartmentHold();
      logCancellation('user');
    },
  },

  // PAID transitions
  {
    from: 'PAID',
    to: 'ACTIVE',
    trigger: 'rental_started',
    guard: () => isWithinAccessWindow(),
    action: () => {
      markCompartmentOccupied();
      scheduleReturnReminder();
      scheduleOverdueCheck();
    },
  },
  {
    from: 'PAID',
    to: 'CANCELLED',
    trigger: 'user_cancelled',
    guard: () => hoursUntilStart() >= 12, // Cancellation policy
    action: () => {
      processRefund();
      releaseCompartment();
      logCancellation('user_paid');
    },
  },

  // ACTIVE transitions
  {
    from: 'ACTIVE',
    to: 'COMPLETED',
    trigger: 'item_returned',
    guard: () => doorClosed() && withinGracePeriod(),
    action: () => {
      markCompartmentAvailable();
      releaseDeposit();
      sendReturnConfirmation();
    },
  },
  {
    from: 'ACTIVE',
    to: 'OVERDUE',
    trigger: 'end_time_passed',
    guard: () => isPastEndTime() && !isReturned() && pastGracePeriod(),
    action: () => {
      sendOverdueWarning();
      startLateFeeAccrual();
      createIncidentIfCritical();
    },
  },

  // OVERDUE transitions
  {
    from: 'OVERDUE',
    to: 'COMPLETED',
    trigger: 'item_returned',
    action: () => {
      calculateLateFee();
      markCompartmentAvailable();
      partialDepositRelease();
      sendReturnConfirmation();
    },
  },
];
```

### Business Rules

1. **PENDING TTL**: Default 15 minutes. Configurable per-location.
2. **Cancellation Policy**: Free cancellation up to 12 hours before start.
3. **Grace Period**: 30 minutes after `end_at` before OVERDUE status.
4. **Late Fee**: 1.5× hourly rate per hour, calculated to the minute.

---

## 2. Compartment State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPARTMENT STATES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   AVAILABLE ◄────────────────────────────────────────────────┐  │
│       │                                                       │  │
│       │ booking_activated                                     │  │
│       ▼                                                       │  │
│   OCCUPIED ──────────────────── item_returned ────────────────┘  │
│       │                                                          │
│       │ maintenance_scheduled                                    │
│       ▼                                                          │
│   MAINTENANCE ─────────────────── maintenance_complete ──────────┘
│       │                                                          │
│       │ critical_failure                                         │
│       ▼                                                          │
│   OUT_OF_SERVICE                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Definitions

| State | Description | Bookable |
|-------|-------------|----------|
| `AVAILABLE` | Ready for booking | Yes |
| `OCCUPIED` | Active rental in progress | No |
| `MAINTENANCE` | Scheduled maintenance | No |
| `OUT_OF_SERVICE` | Critical failure | No |

---

## 3. Payment State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAYMENT STATES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   PENDING ─────► PROCESSING ─────► COMPLETED                    │
│       │              │                  │                        │
│       │              │                  │ refund_requested       │
│       │              ▼                  ▼                        │
│       └─────────► FAILED         REFUNDED / PARTIALLY_REFUNDED  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Contract State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTRACT STATES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   PENDING ─────────────────────────────────────────► EXPIRED    │
│       │                                                          │
│       │ signature_received                                       │
│       ▼                                                          │
│   SIGNED ──────────────────────────────────────────► VOIDED     │
│                                                      (admin)     │
└─────────────────────────────────────────────────────────────────┘
```

### Signature Requirements Matrix

| Condition | Required Method |
|-----------|-----------------|
| Default | `TYPED` (name) |
| Amount > €200 | `SMART_ID` or `MOBILE_ID` |
| Duration > 7 days | `SMART_ID` or `MOBILE_ID` |
| B2B customer | `SMART_ID` or `ID_CARD` |
| Combination of above | Most restrictive applies |

---

## 5. Incident State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                     INCIDENT STATES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   OPEN ───────► INVESTIGATING ───────► PENDING_ACTION           │
│     │                │                       │                   │
│     │                │                       │                   │
│     │                ▼                       ▼                   │
│     │          ESCALATED ◄─────────────────────                 │
│     │                │                       │                   │
│     │                │                       │                   │
│     ▼                ▼                       ▼                   │
│                   RESOLVED ──────────────► ARCHIVED             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Severity Response Times

| Severity | Response SLA | Description |
|----------|--------------|-------------|
| `P1` | Immediate | Customer blocked, cannot access |
| `P2` | 1 hour | Service degraded but functional |
| `P3` | 24 hours | Minor issue, workaround available |
| `P4` | No SLA | Tracking only |

---

## 6. Locker Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   LOCKER ACCESS FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Request ──► Validate ──► Send Command ──► Hardware       │
│                       │              │              │            │
│                       │              │              ▼            │
│                       │              │         ┌─────────┐       │
│                       │              └────────►│ TIMEOUT │       │
│                       │                        └────┬────┘       │
│                       │                             │            │
│                       ▼                             ▼            │
│                 ┌──────────┐               ┌──────────────┐      │
│                 │ DENIED   │               │ FALLBACK PIN │      │
│                 └──────────┘               └──────────────┘      │
│                                                                  │
│   Hardware Response ──► Log Event ──► Update State              │
│        │                                    │                    │
│        │                                    ▼                    │
│        │                           ┌───────────────┐            │
│        └─────────────────────────► │ OPEN_SUCCESS  │            │
│                                    │ OPEN_FAILURE  │            │
│                                    │ CLOSE_DETECTED│            │
│                                    └───────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Access Validation Rules

```typescript
function validateAccess(booking: Booking, user: User): ValidationResult {
  // Rule 1: User must own booking
  if (booking.userId !== user.id) {
    return { allowed: false, code: 'ACCESS_DENIED', message: 'Not your booking' };
  }

  // Rule 2: Booking must be ACTIVE or PAID
  if (!['ACTIVE', 'PAID'].includes(booking.status)) {
    return { allowed: false, code: 'INVALID_STATUS', message: getStatusMessage(booking.status) };
  }

  // Rule 3: Must be within access window
  const now = new Date();
  const earlyAccess = addMinutes(booking.startAt, -15);
  const lateAccess = addMinutes(booking.endAt, 30);

  if (isBefore(now, earlyAccess)) {
    return { allowed: false, code: 'TOO_EARLY', message: `Access available from ${earlyAccess}` };
  }

  if (isAfter(now, lateAccess)) {
    return { allowed: false, code: 'RENTAL_ENDED', message: 'Rental period has ended' };
  }

  // Rule 4: Check attempt limit for app access
  if (booking.accessAttempts >= 3) {
    return { allowed: false, code: 'MAX_ATTEMPTS', fallback: { type: 'PIN', pin: booking.accessPin } };
  }

  return { allowed: true };
}
```

---

## 7. Notification Triggers

### Event-to-Notification Mapping

| Event | Email | SMS | Push | Timing |
|-------|-------|-----|------|--------|
| `booking.created` | ✓ | | ✓ | Immediate |
| `payment.confirmed` | ✓ | | ✓ | Immediate |
| `rental.starting` | ✓ | ✓ | ✓ | 1 hour before |
| `return.reminder` | ✓ | ✓ | ✓ | 30 min before end |
| `booking.overdue` | ✓ | ✓ | ✓ | Immediate |
| `return.confirmed` | ✓ | | ✓ | Immediate |
| `late_fee.charged` | ✓ | ✓ | | Immediate |
| `extension.approved` | ✓ | | ✓ | Immediate |
| `incident.update` | ✓ | | ✓ | Immediate |

### Quiet Hours

Notifications (except P1 critical) are held during quiet hours:
- Default: 22:00 - 08:00 in user's timezone
- User-configurable
- SMS always respects quiet hours except for true emergencies

---

## 8. Background Job Definitions

### Scheduled Jobs

```typescript
// Every minute: Check for expired PENDING bookings
@Cron('* * * * *')
async expirePendingBookings() {
  const expired = await prisma.booking.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
  });
  
  for (const booking of expired) {
    await this.transitionToExpired(booking.id);
  }
}

// Every minute: Check for overdue ACTIVE bookings
@Cron('* * * * *')
async checkOverdueBookings() {
  const gracePeriod = 30; // minutes
  const overdueThreshold = subMinutes(new Date(), gracePeriod);
  
  const overdue = await prisma.booking.findMany({
    where: {
      status: 'ACTIVE',
      endAt: { lt: overdueThreshold },
    },
  });
  
  for (const booking of overdue) {
    await this.transitionToOverdue(booking.id);
  }
}

// Every 5 minutes: Sync locker status
@Cron('*/5 * * * *')
async syncLockerStatus() {
  const lockers = await prisma.locker.findMany({
    where: { status: { not: 'OUT_OF_SERVICE' } },
  });
  
  for (const locker of lockers) {
    const status = await this.hardwareService.ping(locker.externalId);
    await this.updateLockerStatus(locker.id, status);
  }
}

// Daily at 2 AM: Generate daily operations report
@Cron('0 2 * * *')
async generateDailyReport() {
  const yesterday = subDays(startOfDay(new Date()), 1);
  await this.reportService.generateDaily(yesterday);
}
```

---

## 9. Concurrency Control

### Optimistic Locking

```typescript
// Version field for optimistic locking
model Booking {
  version Int @default(0)
}

// Update with version check
async updateBooking(id: string, data: UpdateData, expectedVersion: number) {
  try {
    return await prisma.booking.update({
      where: { 
        id,
        version: expectedVersion, // Will fail if version changed
      },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ConflictException('Booking was modified by another request');
    }
    throw error;
  }
}
```

### Distributed Locking

```typescript
// Redis-based distributed lock for critical sections
async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const lockKey = `lock:${key}`;
  const lockValue = `${Date.now()}-${Math.random()}`;
  
  const acquired = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
  if (!acquired) {
    throw new ConflictException('Resource is locked');
  }
  
  try {
    return await fn();
  } finally {
    // Only release if we still own the lock
    const currentValue = await redis.get(lockKey);
    if (currentValue === lockValue) {
      await redis.del(lockKey);
    }
  }
}
```

---

## 10. Idempotency Pattern

```typescript
// Middleware for idempotent operations
async handleIdempotentRequest(
  key: string,
  ttlSeconds: number,
  operation: () => Promise<any>
) {
  // Check cache first
  const cached = await redis.get(`idempotency:${key}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Acquire lock to prevent duplicate processing
  const lockAcquired = await this.withLock(`idempotency-lock:${key}`, 10000, async () => {
    // Double-check cache after acquiring lock
    const cachedAgain = await redis.get(`idempotency:${key}`);
    if (cachedAgain) {
      return JSON.parse(cachedAgain);
    }
    
    // Execute operation
    const result = await operation();
    
    // Cache result
    await redis.setex(`idempotency:${key}`, ttlSeconds, JSON.stringify(result));
    
    return result;
  });
  
  return lockAcquired;
}
```

---

## Summary

These state machines ensure:

1. **Predictability**: Every state has defined entry/exit conditions
2. **Auditability**: All transitions are logged with timestamps
3. **Reliability**: Guards prevent invalid transitions
4. **Consistency**: Distributed locks prevent race conditions
5. **Recovery**: Clear rules for handling edge cases
