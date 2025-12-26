# Return Flow State Machine

The return process ensures proper handoff of tools from customer back to Rentbox with verification, condition checks, and dispute handling.

## Return Flow Diagram

```
                    ┌────────────────┐
                    │ ACTIVE BOOKING │
                    └────────┬───────┘
                             │
                    Customer initiates return
                             │
                             ▼
                    ┌────────────────┐
                    │ RETURN_STARTED │
                    └────────┬───────┘
                             │
                    Customer places tool
                             │
                             ▼
                    ┌────────────────┐
                    │  TOOL_IN_BOX   │
                    └────────┬───────┘
                             │
                    Compartment locked
                             │
                             ▼
                    ┌────────────────┐
                    │ AWAITING_VERIFY│◄─── Auto-verify or
                    └────────┬───────┘     Manual verify
                             │
                ┌────────────┼────────────┐
                │                         │
          (auto-approve)            (manual review)
                │                         │
                ▼                         ▼
        ┌──────────────┐         ┌──────────────┐
        │  VERIFIED_OK │         │UNDER_REVIEW  │
        └──────┬───────┘         └──────┬───────┘
               │                         │
               │                ┌────────┼────────┐
               │                │                 │
               │           (approve)         (reject)
               │                │                 │
               │                ▼                 ▼
               │         ┌──────────────┐  ┌──────────────┐
               │         │ VERIFIED_OK  │  │ DISPUTED     │
               │         └──────┬───────┘  └──────┬───────┘
               │                │                  │
               └────────────────┼──────────────────┘
                                │
                         Process refund
                                │
                                ▼
                       ┌─────────────────┐
                       │    COMPLETED    │
                       └─────────────────┘
```

## Return Stages

### 1. RETURN_STARTED
**Customer initiates return process.**

**Actions:**
- Customer clicks "Return Tool" in app
- Optional: Upload photos of tool condition
- Optional: Add condition notes
- System records `return_initiated_at` timestamp

**Required Data:**
```json
{
  "booking_id": "uuid",
  "condition_notes": "Tool in good condition, no visible damage",
  "photos": [
    "https://cdn.rentbox.ee/returns/uuid-1.jpg",
    "https://cdn.rentbox.ee/returns/uuid-2.jpg"
  ],
  "initiated_at": "2024-12-27T13:50:00Z"
}
```

**Validations:**
- Booking must be ACTIVE or OVERDUE
- User must be booking owner
- Photos (if uploaded) validated for format/size

**Next Steps:**
- Display instructions: "Please place tool in compartment and close door"
- Show return PIN
- Enable compartment access

---

### 2. TOOL_IN_BOX
**Customer placed tool in compartment.**

**Triggered by:**
- Compartment door closed sensor
- OR Manual confirmation by customer
- OR Timeout (5 minutes after RETURN_STARTED)

**System Actions:**
- Verify compartment locked
- Record `tool_returned_at` timestamp
- Take internal photo (if locker has camera)
- Disable pickup access
- Enable next customer's access (if booking exists)

**Required Data:**
```json
{
  "compartment_locked": true,
  "tool_returned_at": "2024-12-27T13:55:17Z",
  "internal_photo": "https://cdn.rentbox.ee/internal/uuid.jpg",
  "lock_status": "engaged"
}
```

---

### 3. AWAITING_VERIFY
**Tool returned, pending verification.**

**Auto-Verify Criteria (Skip manual review):**
```typescript
function shouldAutoVerify(booking: Booking): boolean {
  return (
    // Customer has good history
    booking.user.successful_rentals >= 5 &&
    booking.user.incident_count === 0 &&
    
    // Rental was not overdue
    booking.status !== 'overdue' &&
    
    // No damage flags
    booking.return_photos?.length === 0 && // No photos = no concern
    
    // Low value tool
    booking.deposit_amount <= 5000 && // ≤50 EUR
    
    // Short rental
    booking.duration_hours <= 24
  );
}
```

**If auto-verify:**
- Immediate transition to VERIFIED_OK
- Process refund automatically
- Send completion email

**If manual review required:**
- Create admin task
- Hold deposit refund
- Notify customer: "Return under review, refund in 1-2 business days"
- Assign to next available operator

**SLA:**
- Standard: 24 hours
- High-value (>100 EUR): 4 hours
- Overdue bookings: 2 hours

---

### 4. UNDER_REVIEW
**Admin manually verifying tool condition.**

**Admin Dashboard Shows:**
```json
{
  "booking_id": "uuid",
  "booking_number": "BK-2024-001234",
  "customer": {
    "name": "John Doe",
    "email": "user@example.com",
    "rental_history": {
      "total_rentals": 3,
      "incidents": 0
    }
  },
  "tool": {
    "name": "Bosch Hammer Drill",
    "sku": "TOOL-001",
    "condition_before": "Good"
  },
  "return_details": {
    "returned_at": "2024-12-27T13:55:17Z",
    "overdue_by_hours": 0,
    "customer_photos": ["url1", "url2"],
    "customer_notes": "Tool in good condition",
    "internal_photo": "url"
  },
  "review_checklist": [
    { "item": "Tool present in compartment", "checked": false },
    { "item": "No visible damage", "checked": false },
    { "item": "All accessories included", "checked": false },
    { "item": "Functional test passed", "checked": false }
  ]
}
```

**Admin Actions:**
1. Physical inspection (if needed)
2. Mark checklist items
3. Approve or Dispute

---

### 5. VERIFIED_OK
**Return approved, no issues.**

**System Actions:**
1. Update booking status to COMPLETED
2. Record `verified_at` and `verified_by`
3. Process deposit refund
4. Calculate final costs (including overdue fees if any)
5. Generate invoice
6. Send completion email with receipt
7. Update product instance availability
8. Request review/rating

**Final Data:**
```json
{
  "booking_id": "uuid",
  "status": "completed",
  "return": {
    "returned_at": "2024-12-27T13:55:17Z",
    "verified_at": "2024-12-27T14:00:00Z",
    "verified_by": "admin-uuid",
    "condition_rating": "good",
    "admin_notes": "Tool in excellent condition, no issues"
  },
  "costs": {
    "rental_cost": 2000,
    "overdue_fees": 0,
    "damage_fees": 0,
    "deposit_refund": 10000
  },
  "invoice_id": "uuid"
}
```

---

### 6. DISPUTED
**Issues found with tool or return.**

**Dispute Types:**
1. **Tool damaged**
2. **Tool missing**
3. **Accessories missing**
4. **Excessive wear**
5. **Wrong tool returned**

**Process:**
1. Admin documents issues with photos
2. Estimate repair/replacement cost
3. Notify customer with evidence
4. Customer can accept or challenge
5. If accepted: Deduct from deposit
6. If challenged: Escalate to dispute resolution

**Dispute Record:**
```json
{
  "booking_id": "uuid",
  "dispute": {
    "type": "tool_damaged",
    "description": "Drill chuck damaged, needs replacement",
    "evidence": [
      "https://cdn.rentbox.ee/disputes/damage-1.jpg",
      "https://cdn.rentbox.ee/disputes/damage-2.jpg"
    ],
    "estimated_cost": 8000,
    "created_at": "2024-12-27T14:05:00Z",
    "created_by": "admin-uuid"
  },
  "customer_response": {
    "accepted": false,
    "comment": "Damage was pre-existing",
    "responded_at": "2024-12-27T15:30:00Z"
  },
  "resolution": {
    "outcome": "customer_favor", // or "rentbox_favor" or "split"
    "final_charge": 4000,
    "resolved_at": "2024-12-27T18:00:00Z",
    "resolved_by": "senior-admin-uuid",
    "notes": "Customer provided evidence of pre-existing damage from pickup photos"
  }
}
```

---

## Return Types

### Standard Return (On-Time)
**Characteristics:**
- `actual_end_at <= end_at`
- No overdue fees
- Full deposit refund (if no damage)
- Auto-verify if criteria met

**Timeline:**
1. Customer initiates: `end_at - 5min`
2. Tool in box: `end_at - 2min`
3. Auto-verified: Immediate
4. Refund initiated: +5min
5. Refund arrives: 1-3 business days

---

### Late Return (Overdue)
**Characteristics:**
- `actual_end_at > end_at`
- Overdue fees calculated
- Manual review required
- Extended verification time

**Timeline:**
1. Customer initiates: `end_at + 3h`
2. Tool in box: `end_at + 3h 5min`
3. Manual review: +1-4 hours
4. Verified: `end_at + 7h`
5. Overdue fees charged
6. Remaining deposit refunded

**Overdue Fee Calculation:**
```typescript
function calculateOverdueFees(booking: Booking): number {
  const overdueHours = Math.ceil(
    (booking.actual_end_at - booking.end_at) / (1000 * 60 * 60)
  );
  
  // Overdue rate = 2× hourly rate
  const overdueRate = booking.price_per_hour * 2;
  
  return overdueHours * overdueRate;
}
```

---

### Early Return
**Characteristics:**
- `actual_end_at < end_at`
- Customer returned tool early
- No refund for unused time (policy decision)
- Can offer as goodwill

**Policy Options:**
1. **No refund** (default): "Booking is for time slot, not usage"
2. **Partial refund**: 50% of unused time
3. **Credit**: Store credit for next rental

**Implementation:**
```typescript
function handleEarlyReturn(booking: Booking): EarlyReturnResult {
  const unusedHours = Math.floor(
    (booking.end_at - booking.actual_end_at) / (1000 * 60 * 60)
  );
  
  if (unusedHours < 2) {
    // Less than 2 hours early - no refund
    return { refund_amount: 0, reason: 'minimum_threshold' };
  }
  
  if (booking.user.loyalty_tier === 'gold') {
    // 50% refund for loyal customers
    const refund = Math.floor(unusedHours * booking.price_per_hour * 0.5);
    return { refund_amount: refund, reason: 'loyalty_bonus' };
  }
  
  // Default: no refund, but offer credit
  const credit = Math.floor(unusedHours * booking.price_per_hour * 0.25);
  return { 
    refund_amount: 0, 
    credit_amount: credit,
    reason: 'early_return_credit' 
  };
}
```

---

## Photo Requirements

### Customer Photos (Optional but Recommended)
**When to require:**
- High-value tools (deposit >100 EUR)
- First-time renters
- Tools with history of damage

**Photo Requirements:**
- Min 2 photos (overview + close-up)
- Max 5MB per photo
- Formats: JPEG, PNG
- Metadata preserved (timestamp, GPS if available)

**Example Prompt:**
```
📸 Before returning, please take 2 photos:
1. Overall view of the tool
2. Close-up of any wear or damage

This protects both you and us in case of disputes.
```

---

### Internal Photos (Automatic)
**Locker with camera:**
- Take photo when door closes
- Timestamp recorded
- Used for verification
- Customer cannot see (privacy)

**Locker without camera:**
- Admin physically inspects periodically
- Take photo during inspection
- Associate with last completed booking

---

## Return Notification Flow

### Customer Notifications

**1. Return Initiated:**
```
Subject: Return Started - BK-2024-001234
Body: We've received your return request.
Action: Place the tool in compartment C-05 and close the door.
```

**2. Tool Received:**
```
Subject: Tool Received - Thank You!
Body: We've confirmed the tool is back in the compartment.
Action: Your deposit refund is being processed (1-3 business days).
```

**3. Verification Delay:**
```
Subject: Return Under Review
Body: Our team is reviewing your return.
Action: You'll receive your refund within 24 hours.
```

**4. Verified:**
```
Subject: Return Approved - Refund Processed
Body: Your return has been approved. Deposit refund of 100.00 EUR initiated.
Action: Rate your experience [link]
```

**5. Disputed:**
```
Subject: Return Review - Action Required
Body: We found some issues with the returned tool.
Action: Review the details and respond [link]
```

---

### Admin Notifications

**High-Priority Review Needed:**
```
Subject: [ACTION REQUIRED] Return Review - BK-2024-001234
Body: 
- Customer: John Doe
- Tool: Bosch Hammer Drill
- Overdue by: 3 hours
- Photos: 2 uploaded
Action: Review return [dashboard link]
SLA: 2 hours
```

---

## Dispute Resolution Process

### Level 1: Operator Review (0-24h)
**Operator assesses:**
- Customer photos vs actual condition
- Repair cost estimate
- Customer history

**Outcomes:**
- Approve (no charge)
- Minor deduction (<20% of deposit)
- Major deduction (>20% of deposit) → escalate

---

### Level 2: Senior Admin Review (24-48h)
**Required for:**
- Disputes >50 EUR
- Customer challenges operator decision
- Ambiguous cases

**Process:**
1. Review all evidence
2. Compare with pickup photos (if available)
3. Consider customer history
4. Make final decision
5. Document reasoning

---

### Level 3: External Arbitration (48h+)
**For disputes >200 EUR or legal threats:**
- Engage third-party mediator
- Provide full documentation
- Binding decision

---

## Return Checklist (Admin)

### Physical Inspection Checklist
```
□ Tool present in correct compartment
□ Correct tool (match SKU/serial)
□ No visible damage to body
□ No cracks or breaks
□ All accessories present:
  □ Carrying case
  □ Power cable
  □ Instruction manual
  □ [Tool-specific accessories]
□ Functional test:
  □ Powers on
  □ Main function works
  □ Safety features intact
□ Cleanliness acceptable
□ Overall condition: [Excellent/Good/Fair/Poor]
```

---

## Edge Cases

### Case 1: Customer Returns Wrong Tool
**Scenario:** Different drill returned to compartment

**Handling:**
1. Admin detects during verification
2. Create P1 incident
3. Contact customer immediately
4. Two sub-cases:
   - **Honest mistake:** Customer has both tools, swap them
   - **Malicious:** Hold deposit, report theft if unresponsive

---

### Case 2: Tool Missing from Compartment
**Scenario:** Door closed but tool not inside

**Handling:**
1. Check access logs - who opened last?
2. If customer never accessed: Rentbox error, full refund + apology
3. If customer accessed: Attempt contact (24h)
4. If unresponsive: Charge full replacement cost
5. Create incident + police report if >48h

---

### Case 3: Compartment Malfunction During Return
**Scenario:** Door won't close/lock

**Handling:**
1. Customer reports via app
2. Create P0 incident
3. Offer alternatives:
   - Wait for tech (ETA provided)
   - Return to different locker
   - Staff pickup (if available)
4. Extend rental free of charge
5. Compensation credit

---

### Case 4: Duplicate Return Attempts
**Scenario:** Network issue causes customer to submit twice

**Handling:**
- Idempotency key prevents duplicate processing
- Return same response for duplicate requests
- Single refund processed

---

### Case 5: Return After Business Hours
**Scenario:** Return initiated at 11 PM

**Handling:**
- Allow return 24/7 (self-service)
- Verification queued for next business day
- Notify customer of delay
- SLA adjusted (24h from next business day start)

---

## Monitoring & Metrics

### Key Metrics

**Return Rate:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as return_rate
FROM bookings
WHERE status IN ('completed', 'overdue');
```

**On-Time Return Rate:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE actual_end_at <= end_at) * 100.0 / 
  COUNT(*) as on_time_rate
FROM bookings
WHERE status = 'completed';
```

**Average Verification Time:**
```sql
SELECT 
  AVG(verified_at - actual_end_at) as avg_verification_time
FROM bookings
WHERE verified_at IS NOT NULL;
```

**Dispute Rate:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE damage_fees > 0) * 100.0 / COUNT(*) as dispute_rate
FROM bookings
WHERE status = 'completed';
```

---

### Alerts

**Critical (P0):**
- Verification SLA breached (>48h)
- Dispute escalated to legal
- Tool missing >72h

**High (P1):**
- >10 returns awaiting verification
- Dispute rate >5% (daily)
- Average verification time >24h

**Medium (P2):**
- Late return rate >10%
- Customer photo upload rate <50%

---

## Summary

**The return flow ensures:**
1. ✅ Clear return process for customers
2. ✅ Automatic verification when possible
3. ✅ Fair dispute resolution
4. ✅ Audit trail with photos/notes
5. ✅ Fast deposit refunds
6. ✅ Protection for both parties

**Every return includes:**
- Timestamp of return
- Condition documentation
- Admin verification (auto or manual)
- Refund processing
- Invoice generation
- Opportunity for feedback
