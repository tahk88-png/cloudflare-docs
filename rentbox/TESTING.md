# Testing & Validation Procedures

## 1. Critical Path Validation (Manual / E2E)

These scenarios must be verified before any production release.

### Scenario A: The "Happy Path" Locker Open
1.  **Setup**: Create a Booking via DB Seed or SQL.
    *   Status: `PAID`
    *   Time: `Now` inside `[Start-30m, End]`
    *   Risk Score: `0`
2.  **Action**: User requests "Open Locker" via Chat.
3.  **Expected Result**:
    *   AI responds "Opening...".
    *   `LockerOpenAttempt` created with status `PENDING`.
    *   Gateway receives request.
    *   Gateway calls back `locker.open_result` (success).
    *   `LockerOpenAttempt` updates to `SUCCESS`.
    *   AI confirms "Locker opened."

### Scenario B: The "High Risk" Block
1.  **Setup**: Booking with `Risk Score: 85`.
2.  **Action**: User requests "Open Locker".
3.  **Expected Result**:
    *   **Denial**: AI responds with policy refusal ("Risk check failed" or generic "Contact support").
    *   **Log**: `LockerOpenAttempt` NOT created (blocked at policy layer) OR created as `BLOCKED` (if logic permits, current logic throws Error).
    *   **Audit**: `AiAction` logged with `reason: Policy Violation`.

### Scenario C: The "Gateway Failure" Fallback
1.  **Setup**: Valid booking.
2.  **Action**: Gateway returns `500` or Callback sends `success: false`.
3.  **Expected Result**:
    *   `LockerOpenAttempt` updates to `FAILURE`.
    *   **Ticket Created**: Priority `URGENT` assigned to `OPS`.
    *   **Notification**: User receives SMS apology.
    *   **Stats**: Locker reliability score decremented.

## 2. Integration Testing (Automated)

Run these using a test runner (Jest/Vitest) against a test DB.

### Unit: `locker-api.ts`
*   `openLocker(..., isOverride=false)`
    *   Should throw if `booking.status == DRAFT`.
    *   Should throw if `time < start - 30m`.
    *   Should throw if `risk > 80`.
    *   Should pass if all conditions met.
*   `openLocker(..., isOverride=true)`
    *   Should pass regardless of booking state.

### Unit: `webhooks/locker`
*   **Signature Verification**:
    *   Send valid payload + valid `X-Gateway-Signature` → `200 OK`.
    *   Send valid payload + invalid Signature → `401 Unauthorized`.
    *   Send valid payload + missing Signature → `401 Unauthorized`.

## 3. Load & Rate Limit Testing

*   **Attack**: Simulate 100 open requests for the same booking in 1 minute.
*   **Defense**:
    *   Requests 1-2: Processed (depending on logic/gateway speed).
    *   Requests 3+: Rejected immediately by `LockerOpenAttempt` rate limit check.
    *   **Verify**: DB CPU remains stable; Gateway is not flooded.

## 4. Audit Trail Verification

After every test session, query:
```sql
SELECT * FROM "AiAction" ORDER BY "createdAt" DESC;
SELECT * FROM "LockerOpenAttempt" ORDER BY "createdAt" DESC;
```
**Constraint**: Every state change MUST have a corresponding log entry. If a locker opened and there is no log, the test **FAILS**.
