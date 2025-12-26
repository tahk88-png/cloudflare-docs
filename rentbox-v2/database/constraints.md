# Database Constraints & Business Rules

This document explains the critical constraints that enforce Rentbox v2's core business rules at the database level.

## Philosophy

**The database is the last line of defense.** Application logic can have bugs, but database constraints are immutable guardrails that prevent data corruption.

## Critical Constraints

### 1. No Double Bookings (EXCLUSION CONSTRAINT)

**The Most Important Rule**

```sql
EXCLUDE USING GIST (
  compartment_id WITH =,
  tstzrange(start_at, end_at) WITH &&
) WHERE (status NOT IN ('cancelled', 'expired'))
```

**What it does:**
- Prevents two bookings from overlapping in time for the same compartment
- Uses PostgreSQL's advanced GIST index with range types
- Only applies to active bookings (ignores cancelled/expired)

**Why it's critical:**
- Physical reality: One compartment cannot hold two tools at once
- Trust: Double bookings destroy user confidence
- Legal: Could result in unresolvable disputes

**Example that would be rejected:**

```sql
-- Booking 1: 2024-12-27 10:00 → 12:00 (Compartment C-05)
-- Booking 2: 2024-12-27 11:00 → 13:00 (Compartment C-05)
-- ❌ REJECTED: Times overlap
```

**Example that would be accepted:**

```sql
-- Booking 1: 2024-12-27 10:00 → 12:00 (Compartment C-05)
-- Booking 2: 2024-12-27 12:00 → 14:00 (Compartment C-05)
-- ✅ ACCEPTED: Times are adjacent, not overlapping
```

---

### 2. Valid Time Ranges

**Booking times must be logical:**

```sql
CONSTRAINT valid_time_range CHECK (end_at > start_at)
```

**Prevents:**
- End time before start time
- Zero-duration bookings
- Negative time travel

**Application layer should enforce minimum duration (e.g., 1 hour), but database ensures end > start.**

---

### 3. Non-Negative Money

**Money cannot be negative:**

```sql
CONSTRAINT positive_costs CHECK (
  total_rental_cost >= 0 AND
  overdue_fees >= 0 AND
  damage_fees >= 0 AND
  deposit_amount >= 0
)
```

**Why:**
- Prevents accounting errors
- Refunds are handled via separate `payments.refunded_amount`
- Fees are always additive, never negative

---

### 4. Refund Limits

**Refunds cannot exceed original payment:**

```sql
CONSTRAINT valid_refund CHECK (
  refunded_amount >= 0 AND 
  refunded_amount <= amount
)
```

**Prevents:**
- Negative refunds (money creation)
- Over-refunding (refunding more than paid)

---

### 5. Actual Time Logic

**If booking has actual times, they must be logical:**

```sql
CONSTRAINT valid_actual_times CHECK (
  actual_end_at IS NULL OR 
  actual_end_at >= actual_start_at
)
```

**Allows:**
- `actual_start_at` without `actual_end_at` (rental in progress)
- Both NULL (not yet started)
- Both set with valid range

**Prevents:**
- Return before pickup

---

### 6. Unique Compartment Instance

**One physical tool per compartment:**

```sql
CONSTRAINT unique_compartment_instance UNIQUE(compartment_id)
```

**Ensures:**
- Each compartment contains at most one product instance
- Physical reality matches database state

---

### 7. Email Format Validation

**Basic email structure:**

```sql
CONSTRAINT email_format CHECK (
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
)
```

**Note:** This is a basic check. Full email validation happens at application layer with confirmation emails.

---

### 8. Phone Format Validation

**International phone numbers:**

```sql
CONSTRAINT phone_format CHECK (
  phone IS NULL OR 
  phone ~* '^\+?[0-9]{8,15}$'
)
```

**Allows:**
- NULL (phone is optional)
- 8-15 digits with optional + prefix
- Application layer should normalize to E.164 format

---

### 9. No Overlapping Maintenance Blocks

**Maintenance windows cannot overlap for the same compartment:**

```sql
EXCLUDE USING GIST (
  compartment_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
```

**Same logic as booking exclusion, but applies to maintenance blocks.**

---

### 10. Unique Identifiers

**Business-level unique identifiers:**

```sql
-- Users
email VARCHAR(255) UNIQUE NOT NULL

-- Products
slug VARCHAR(255) UNIQUE NOT NULL
sku VARCHAR(100) UNIQUE NOT NULL

-- Bookings
booking_number VARCHAR(50) UNIQUE NOT NULL
idempotency_key VARCHAR(255) UNIQUE

-- Invoices
invoice_number VARCHAR(50) UNIQUE NOT NULL

-- Incidents
incident_number VARCHAR(50) UNIQUE NOT NULL
```

**Why:**
- Human-readable references
- Idempotent operations
- External system integration

---

## Foreign Key Constraints

### Delete Behaviors

**RESTRICT** (Most common - prevents deletion):
```sql
bookings.user_id → users.id ON DELETE RESTRICT
bookings.product_instance_id → products.id ON DELETE RESTRICT
```

**Rationale:** Historical data must be preserved. Users and products referenced in bookings cannot be deleted.

**CASCADE** (Delete dependent records):
```sql
user_sessions.user_id → users.id ON DELETE CASCADE
incident_comments.incident_id → incidents.id ON DELETE CASCADE
```

**Rationale:** Sessions and comments have no independent meaning without their parent.

**SET NULL** (Preserve record but clear reference):
```sql
audit_logs.user_id → users.id ON DELETE SET NULL
incidents.booking_id → bookings.id ON DELETE SET NULL
```

**Rationale:** Audit logs and incidents must survive even if referenced entities are deleted (though deletion should be rare).

---

## Index Strategy

### Primary Purpose Indexes

**Lookups:**
- `idx_bookings_booking_number` - Customer lookup by booking number
- `idx_users_email` - Login authentication
- `idx_products_sku` - Product catalog lookups

**Relations:**
- `idx_bookings_user_id` - User's booking history
- `idx_bookings_compartment_id` - Compartment occupancy
- `idx_payments_booking_id` - Booking payment status

**Time-based queries:**
- `idx_bookings_time_range` - Availability searches
- `idx_access_logs_created_at` - Audit trail queries
- `idx_notifications_next_retry_at` - Notification retry jobs

**Status filters:**
- `idx_bookings_status` - Active/pending bookings
- `idx_incidents_status` - Open incidents dashboard
- `idx_notifications_status` - Failed notification tracking

### Composite Indexes

**Availability queries** (most performance-critical):
```sql
-- Location + time range
CREATE INDEX idx_location_availability 
  ON bookings(location_id, start_at, end_at) 
  WHERE status NOT IN ('cancelled', 'expired');

-- Product + time range
CREATE INDEX idx_product_availability 
  ON product_instances(product_id, is_available);
```

---

## Transaction Isolation

### Critical Operations Requiring SERIALIZABLE

**Booking Creation:**
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  -- Check availability
  -- Create booking
  -- Create payment
  -- Create agreement
COMMIT;
```

**Why:** Prevents race conditions during high-traffic booking windows.

**Extension/Modification:**
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  -- Lock booking row
  -- Check no conflicts with new end_at
  -- Update booking
  -- Adjust payment
COMMIT;
```

---

## Optimistic Locking

**For concurrent updates:**

```sql
-- bookings.lock_version incremented on each update
UPDATE bookings 
SET 
  status = 'active',
  lock_version = lock_version + 1
WHERE id = $1 
  AND lock_version = $2; -- Must match current version

-- If rowcount = 0, conflict detected
```

**Use cases:**
- Admin modifying active booking
- User extending rental
- System auto-transitioning status

---

## Idempotency Keys

**Prevents duplicate operations:**

```sql
bookings.idempotency_key VARCHAR(255) UNIQUE
payments.idempotency_key VARCHAR(255) UNIQUE
```

**Client usage:**
```javascript
// Generate once per operation attempt
const idempotencyKey = `booking-${userId}-${timestamp}-${randomUUID()}`;

await createBooking({
  ...bookingData,
  idempotencyKey
});

// If retry due to network error, same key ensures no duplicate
```

**Server behavior:**
```javascript
// Check if booking with this key exists
const existing = await db.bookings.findOne({ idempotency_key: key });
if (existing) {
  return existing; // Return existing, don't create duplicate
}

// Create new booking
const booking = await db.bookings.create({ ...data, idempotency_key: key });
```

---

## Soft Deletes vs Hard Deletes

### Never Hard Delete

**These entities are immutable:**
- `bookings` - Legal/accounting records
- `payments` - Financial records
- `rental_agreements` - Legal contracts
- `audit_logs` - Audit trail
- `access_logs` - Security logs
- `invoices` - Tax compliance

**Instead, use status flags:**
```sql
bookings.status = 'cancelled'
bookings.cancelled_at = NOW()
```

### Soft Delete Pattern

**For entities that need "deletion":**
```sql
ALTER TABLE some_table ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete"
UPDATE some_table SET deleted_at = NOW() WHERE id = $1;

-- Filter out deleted
SELECT * FROM some_table WHERE deleted_at IS NULL;

-- Restore
UPDATE some_table SET deleted_at = NULL WHERE id = $1;
```

### Can Hard Delete (with caution)

- `user_sessions` - Ephemeral
- `notifications` (after retention period) - Cleanup for performance
- `ai_suggestions` (after retention period) - Non-critical

---

## Data Retention

### Forever (Legal/Compliance)

- Bookings: 10 years minimum
- Payments: 10 years minimum
- Invoices: 10 years minimum
- Rental Agreements: 10 years minimum
- Audit Logs: 10 years minimum

### 2 Years

- Access Logs: 2 years (after last access)
- Incident Records: 2 years (after closed)
- Notification Logs: 2 years

### 90 Days

- User Sessions: Auto-expire
- AI Suggestions: Archive to cold storage

### GDPR Considerations

**User requests "right to be forgotten":**

1. ❌ Cannot delete booking/payment records (legal requirement)
2. ✅ Can anonymize personal data:
   ```sql
   UPDATE users SET
     email = 'deleted-user-{id}@anonymized.rentbox.com',
     phone = NULL,
     first_name = 'Deleted',
     last_name = 'User',
     national_id = NULL,
     is_active = FALSE
   WHERE id = $1;
   ```
3. ✅ Delete non-essential data:
   ```sql
   DELETE FROM user_sessions WHERE user_id = $1;
   DELETE FROM ai_suggestions WHERE user_id = $1;
   ```

---

## Monitoring & Alerts

### Constraint Violations to Alert On

**Critical (P0):**
- Exclusion constraint failures on bookings table
- Foreign key violations on critical paths
- Unique constraint violations (may indicate application bug)

**Warning (P2):**
- Check constraint failures (bad data from client)
- Transaction deadlocks (optimize query patterns)

### Performance Degradation

**Monitor:**
- `idx_bookings_time_range` usage - availability queries
- `active_bookings` view query time
- Transaction duration for booking creation

**Alert when:**
- Booking creation >1s
- Availability query >500ms
- Lock wait time >100ms

---

## Testing Constraints

### Unit Tests for Constraints

```sql
-- Test: Double booking prevention
BEGIN;
  INSERT INTO bookings (..., start_at = '2024-12-27 10:00', end_at = '2024-12-27 12:00');
  -- Should succeed
  
  INSERT INTO bookings (..., start_at = '2024-12-27 11:00', end_at = '2024-12-27 13:00');
  -- Should fail with exclusion constraint violation
ROLLBACK;

-- Test: Adjacent bookings allowed
BEGIN;
  INSERT INTO bookings (..., start_at = '2024-12-27 10:00', end_at = '2024-12-27 12:00');
  INSERT INTO bookings (..., start_at = '2024-12-27 12:00', end_at = '2024-12-27 14:00');
  -- Both should succeed
ROLLBACK;

-- Test: Time range validation
BEGIN;
  INSERT INTO bookings (..., start_at = '2024-12-27 12:00', end_at = '2024-12-27 10:00');
  -- Should fail with CHECK constraint violation
ROLLBACK;
```

### Load Testing

**Simulate high concurrency:**
- 100 users trying to book same compartment simultaneously
- Expected: 1 succeeds, 99 get constraint error
- Verify: No double bookings created

---

## Migration Safety

### Adding Constraints to Existing Data

**Problem:** Adding constraint to table with existing data may fail if data violates constraint.

**Solution:**

```sql
-- 1. Add constraint as NOT VALID (doesn't check existing data)
ALTER TABLE bookings 
  ADD CONSTRAINT some_new_constraint CHECK (...) NOT VALID;

-- 2. Validate constraint (checks existing data, allows reads during validation)
ALTER TABLE bookings VALIDATE CONSTRAINT some_new_constraint;
```

### Removing Constraints

**Never remove constraints without:**
1. Verifying no application code depends on the constraint
2. Adding equivalent validation at application layer
3. Testing thoroughly in staging
4. Documenting the change

---

## Summary

**The database schema enforces:**
1. ✅ No double bookings (exclusion constraint)
2. ✅ Valid time ranges (check constraints)
3. ✅ Non-negative money (check constraints)
4. ✅ Data integrity (foreign keys)
5. ✅ Unique identifiers (unique constraints)
6. ✅ Immutable history (soft deletes)

**The application must additionally enforce:**
- Business logic (minimum rental duration, pricing rules)
- User permissions (RBAC)
- External integrations (payment providers, locker hardware)

**When in doubt: Add a constraint.** It's easier to remove a constraint than to fix corrupted data.
