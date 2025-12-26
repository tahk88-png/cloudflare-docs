# Incident Lifecycle State Machine

Incidents track operational issues, hardware failures, and customer disputes. Every incident has a clear lifecycle with SLA tracking and resolution workflow.

## State Diagram

```
                    ┌──────────────┐
                    │     OPEN     │ ◄─── Initial state
                    └──────┬───────┘
                           │
                    Assigned to technician
                           │
                           ▼
                ┌──────────────────────┐
                │   INVESTIGATING      │
                └──────┬───────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   (fix found)  (needs parts)  (escalate)
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐  ┌─────────────┐  ┌────────┐
   │RESOLVED │  │WAITING_PARTS│  │ OPEN   │
   └────┬────┘  └──────┬──────┘  └────────┘
        │              │
        │       (parts arrived)
        │              │
        │              ▼
        │       ┌─────────────┐
        │       │INVESTIGATING│
        │       └──────┬──────┘
        │              │
        │         (fixed)
        │              │
        │              ▼
        │       ┌─────────┐
        └───────►RESOLVED │
                └────┬────┘
                     │
              (verification period)
                     │
                     ▼
                ┌─────────┐
                │ CLOSED  │ ◄─── Terminal state
                └─────────┘
```

## States

### 1. OPEN
**Initial state when incident is reported.**

**Characteristics:**
- Unassigned or newly assigned
- SLA timer starts immediately
- Auto-assign based on incident type
- High-priority incidents trigger alerts

**Required Data:**
```json
{
  "id": "uuid",
  "incident_number": "INC-2024-001234",
  "status": "open",
  "severity": "p1",
  "title": "Locker L-001 offline",
  "description": "Cannot communicate with locker at Tallinn Central. Last ping: 30 minutes ago.",
  "reported_by": "system-uuid",
  "assigned_to": null,
  "locker_id": "uuid",
  "sla_due_at": "2024-12-26T11:30:00Z",
  "created_at": "2024-12-26T10:30:00Z"
}
```

**Auto-Assignment Rules:**
```typescript
function autoAssign(incident: Incident): User {
  // P0: Page on-call engineer immediately
  if (incident.severity === 'p0') {
    const onCall = getOnCallEngineer();
    sendPagerAlert(onCall);
    return onCall;
  }
  
  // Hardware issues: Assign to technician
  if (incident.locker_id || incident.compartment_id) {
    return getAvailableTechnician(incident.location);
  }
  
  // Payment issues: Assign to ops team
  if (incident.tags?.includes('payment')) {
    return getNextOperator();
  }
  
  // Default: Round-robin to operators
  return getNextAvailableOperator();
}
```

---

### 2. INVESTIGATING
**Assigned technician/operator is actively working on the issue.**

**Characteristics:**
- Investigation notes being added
- Root cause analysis in progress
- May involve remote diagnostics
- Customer updates sent if affects active booking

**Example Investigation:**
```json
{
  "incident_id": "uuid",
  "status": "investigating",
  "assigned_to": "tech-uuid",
  "investigation": {
    "started_at": "2024-12-26T10:35:00Z",
    "actions_taken": [
      {
        "timestamp": "2024-12-26T10:36:00Z",
        "action": "Pinged locker - no response",
        "user": "tech-uuid"
      },
      {
        "timestamp": "2024-12-26T10:40:00Z",
        "action": "Checked network logs - connection timeout",
        "user": "tech-uuid"
      },
      {
        "timestamp": "2024-12-26T10:45:00Z",
        "action": "Physical inspection - power cable loose",
        "user": "tech-uuid"
      }
    ],
    "root_cause": "Loose power connection causing intermittent connectivity",
    "proposed_solution": "Reconnect power cable and secure with cable tie"
  }
}
```

---

### 3. WAITING_PARTS
**Fix identified but requires replacement parts.**

**Characteristics:**
- Parts ordered
- Estimated arrival date set
- Customer informed of delay
- Temporary workarounds offered
- SLA paused (depending on policy)

**Example:**
```json
{
  "incident_id": "uuid",
  "status": "waiting_parts",
  "parts_order": {
    "order_number": "PO-2024-5678",
    "supplier": "LockCorp Inc",
    "items": [
      {
        "part_number": "LC-LOCK-MODEL-A",
        "description": "Electronic lock mechanism",
        "quantity": 1,
        "cost": 15000
      }
    ],
    "ordered_at": "2024-12-26T11:00:00Z",
    "estimated_arrival": "2024-12-28T09:00:00Z"
  },
  "workaround": {
    "description": "Customers redirected to nearby locker L-002",
    "active_bookings_affected": 3,
    "compensation_offered": "50% discount on next rental"
  }
}
```

**Customer Communication:**
```
Subject: Temporary Service Update - Locker Maintenance

We're performing maintenance on locker L-001 at Tallinn Central.

Your booking (BK-2024-001234) is not affected, but you'll use 
locker L-002 (same location, 50m away).

As an apology, enjoy 50% off your next rental.

Estimated completion: Dec 28, 9 AM
```

---

### 4. RESOLVED
**Issue has been fixed.**

**Characteristics:**
- Fix implemented
- System tested
- Documentation updated
- Customer notified
- 24h verification period before closing

**Resolution Data:**
```json
{
  "incident_id": "uuid",
  "status": "resolved",
  "resolution": {
    "resolved_at": "2024-12-26T11:15:00Z",
    "resolved_by": "tech-uuid",
    "solution": "Reconnected power cable and secured with industrial cable tie. Tested all compartments - all functioning normally.",
    "time_to_resolve_minutes": 45,
    "sla_met": true,
    "verification_test": {
      "test_type": "full_system",
      "results": "All 12 compartments tested - open/close successful",
      "tester": "tech-uuid"
    }
  },
  "follow_up": {
    "scheduled_inspection": "2024-12-29T10:00:00Z",
    "notes": "Monitor for 48h to ensure stability"
  }
}
```

**Verification Period:**
- Monitor for 24 hours
- If issue recurs: Reopen (transition back to INVESTIGATING)
- If stable: Auto-close after 24h

---

### 5. CLOSED
**Terminal state - incident fully resolved and verified.**

**Characteristics:**
- Cannot reopen (create new incident if issue recurs)
- Added to knowledge base
- Metrics updated
- Post-mortem (for P0/P1)

**Final Record:**
```json
{
  "incident_id": "uuid",
  "status": "closed",
  "closed_at": "2024-12-27T11:15:00Z",
  "metrics": {
    "time_to_assign_minutes": 2,
    "time_to_resolve_minutes": 45,
    "time_to_close_hours": 24,
    "sla_met": true,
    "customer_satisfaction": 4.5
  },
  "lessons_learned": "Power cables in high-traffic areas need additional securing. Added to maintenance checklist.",
  "knowledge_base_article": "KB-0045"
}
```

---

## Severity Levels & SLAs

### P0 - Critical (System Down)

**Definition:**
- System-wide outage
- Data loss risk
- Multiple bookings affected
- Payment processing down

**SLA:**
- Response: Immediate (on-call paged)
- Resolution: 1 hour
- Updates: Every 15 minutes

**Examples:**
- All lockers offline
- Database corruption
- Payment gateway down
- Security breach

**Escalation:**
- Auto-escalate to CTO after 30 minutes
- Customer notification (status page)
- Incident war room established

---

### P1 - High (Degraded Service)

**Definition:**
- Single locker offline
- Feature broken but workaround exists
- Affecting <10% of users

**SLA:**
- Response: 15 minutes
- Resolution: 4 hours
- Updates: Every hour

**Examples:**
- Single locker offline
- Notification delays
- Admin dashboard errors
- API rate limiting too aggressive

**Escalation:**
- Auto-escalate to ops manager after 2 hours
- Affected customers notified

---

### P2 - Medium (Feature Broken)

**Definition:**
- Non-critical feature broken
- No customer impact
- Workaround available

**SLA:**
- Response: 1 hour
- Resolution: 24 hours
- Updates: Twice daily

**Examples:**
- Calendar export not working
- PDF invoice generation slow
- Admin report formatting issues

**Escalation:**
- Manual escalation if unresolved after 48h

---

### P3 - Low (Minor Issue)

**Definition:**
- Cosmetic issues
- Enhancement requests
- Documentation errors

**SLA:**
- Response: 4 hours
- Resolution: 7 days
- Updates: Daily (if in progress)

**Examples:**
- UI alignment issues
- Typos in emails
- Feature requests
- Performance optimization

**Escalation:**
- None (triaged in weekly planning)

---

## Incident Types

### Hardware Incidents

**Type: Locker Offline**
```json
{
  "type": "hardware_failure",
  "subtype": "locker_offline",
  "locker_id": "uuid",
  "symptoms": [
    "No MQTT heartbeat for 30 minutes",
    "HTTP endpoint unreachable",
    "Last successful ping: 2024-12-26T10:00:00Z"
  ],
  "impact": {
    "active_bookings": 2,
    "upcoming_bookings_24h": 5,
    "compartments_affected": 12
  },
  "auto_actions": [
    "Customers notified",
    "Bookings redirected to L-002",
    "On-call technician paged"
  ]
}
```

**Type: Compartment Stuck**
```json
{
  "type": "hardware_failure",
  "subtype": "compartment_malfunction",
  "compartment_id": "uuid",
  "locker_id": "uuid",
  "symptoms": [
    "Lock failed to engage after 3 attempts",
    "Motor timeout error",
    "Customer unable to close door"
  ],
  "impact": {
    "active_booking": "BK-2024-001234",
    "customer_id": "uuid"
  },
  "auto_actions": [
    "Customer contacted via phone",
    "Alternative compartment offered",
    "Incident created"
  ]
}
```

---

### Payment Incidents

**Type: Payment Webhook Failure**
```json
{
  "type": "payment_issue",
  "subtype": "webhook_failure",
  "payment_id": "uuid",
  "booking_id": "uuid",
  "provider": "stripe",
  "symptoms": [
    "Webhook signature verification failed",
    "Payment status stuck in 'processing'",
    "Customer charged but booking not activated"
  ],
  "impact": {
    "customer_id": "uuid",
    "amount": 12000
  },
  "auto_actions": [
    "Manual payment verification initiated",
    "Customer notified of delay",
    "Payment provider support ticket created"
  ]
}
```

---

### Customer Incidents

**Type: Dispute**
```json
{
  "type": "customer_dispute",
  "subtype": "damage_claim",
  "booking_id": "uuid",
  "customer_id": "uuid",
  "dispute_details": {
    "claim": "Customer disputes damage charge",
    "original_charge": 8000,
    "customer_evidence": ["url1", "url2"],
    "rentbox_evidence": ["url3", "url4"],
    "customer_statement": "Damage was already present at pickup"
  },
  "impact": {
    "refund_held": 10000
  }
}
```

---

## Incident Response Playbooks

### Playbook: Locker Offline

**Step 1: Assess (0-5 min)**
```
□ Check MQTT broker - is it receiving data from other lockers?
□ Check network - is location online?
□ Check locker status page - last ping timestamp
□ Check affected bookings (active + upcoming 24h)
```

**Step 2: Communicate (5-10 min)**
```
□ Notify affected customers via SMS + Email
□ Update status page
□ Alert on-call technician
□ Post in ops Slack channel
```

**Step 3: Mitigate (10-30 min)**
```
□ Redirect upcoming bookings to nearby locker
□ Offer affected customers:
  - Wait for fix (ETA provided)
  - Alternative locker (with directions)
  - Full refund + 50% next rental credit
□ Update calendar system
```

**Step 4: Fix (30 min - 4h)**
```
□ Remote diagnostics:
  - Ping locker
  - Check logs
  - Test compartment commands
□ Physical inspection if needed:
  - Power supply
  - Network connection
  - Hardware reset
□ Document findings
```

**Step 5: Verify (Post-Fix)**
```
□ Test all compartments
□ Monitor for 30 minutes
□ Send test booking
□ Customer notification: "Service restored"
□ Mark incident RESOLVED
```

**Step 6: Post-Mortem (P0/P1 only)**
```
□ What happened?
□ Why did it happen?
□ How was it detected?
□ What was the impact?
□ How can we prevent it?
□ Action items assigned
```

---

### Playbook: Payment Processing Failure

**Step 1: Verify (0-2 min)**
```
□ Check payment provider status page
□ Check our payment service health
□ Identify scope: Single payment or systemic?
```

**Step 2: Customer Impact (2-5 min)**
```
□ How many affected bookings?
□ Are customers charged but not activated?
□ Severity: P0 if >10 affected, P1 if <10
```

**Step 3: Immediate Action (5-15 min)**
```
□ If single payment:
  - Manual verification via provider dashboard
  - Activate booking manually if payment confirmed
  - Contact customer
□ If systemic:
  - Disable new bookings temporarily
  - Put "Payment maintenance" banner
  - Contact payment provider support
```

**Step 4: Resolution**
```
□ Fix integration issue OR
□ Switch to backup payment provider OR
□ Manual payment collection (phone/email)
```

---

### Playbook: Customer Locked Out

**Step 1: Verify Booking (0-2 min)**
```
□ Check booking status: Should be ACTIVE
□ Check payment: Should be COMPLETED
□ Check access logs: Has customer tried to open?
□ Check locker status: ONLINE?
```

**Step 2: Diagnose (2-5 min)**
```
□ Wrong PIN entered?
  → Send correct PIN via SMS
□ Booking not active yet?
  → Explain start time, offer early access
□ Locker offline?
  → Follow locker offline playbook
□ Compartment malfunction?
  → Offer alternative + immediate refund
```

**Step 3: Resolve (5-15 min)**
```
□ Test remote open command
□ If successful: Customer can access
□ If failed: 
  - Dispatch technician (ETA: X min)
  - Offer alternative locker
  - Full refund + apology credit
```

**Step 4: Compensate**
```
□ <15min delay: Extend rental 1h free
□ 15-30min delay: 50% discount + extend
□ >30min delay: Full refund + 100% next rental credit
```

---

## Incident Escalation Matrix

| Time Elapsed | P0 | P1 | P2 | P3 |
|--------------|-----|-----|-----|-----|
| 15 minutes | Ops Manager | - | - | - |
| 30 minutes | CTO | - | - | - |
| 1 hour | CEO | Ops Manager | - | - |
| 4 hours | - | CTO | - | - |
| 24 hours | - | - | Ops Manager | - |
| 48 hours | - | - | CTO | - |

---

## Incident Metrics

### Time-Based Metrics

```sql
-- Average time to assign
SELECT 
  severity,
  AVG(EXTRACT(EPOCH FROM (
    (SELECT MIN(created_at) FROM incident_comments WHERE incident_id = i.id)
    - i.created_at
  )) / 60) as avg_time_to_first_response_minutes
FROM incidents i
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY severity;

-- SLA compliance rate
SELECT 
  severity,
  COUNT(*) FILTER (WHERE resolved_at <= sla_due_at) * 100.0 / COUNT(*) as sla_met_percentage
FROM incidents
WHERE status = 'closed'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY severity;
```

---

### Root Cause Distribution

```sql
SELECT 
  metadata->>'root_cause' as root_cause,
  COUNT(*) as incident_count
FROM incidents
WHERE status = 'closed'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY root_cause
ORDER BY incident_count DESC;
```

**Example Output:**
```
root_cause              | incident_count
------------------------|---------------
power_failure           | 12
network_connectivity    | 8
hardware_wear           | 5
software_bug            | 3
user_error              | 2
```

---

## Incident Prevention

### Proactive Monitoring

**Alerts that create incidents:**
```typescript
// Locker heartbeat monitoring
if (locker.last_ping_at < now() - minutes(30)) {
  createIncident({
    severity: 'p1',
    type: 'hardware_failure',
    subtype: 'locker_offline',
    title: `Locker ${locker.code} offline for 30 minutes`,
    locker_id: locker.id
  });
}

// Payment processing delays
if (payment.created_at < now() - minutes(15) && payment.status === 'processing') {
  createIncident({
    severity: 'p1',
    type: 'payment_issue',
    subtype: 'processing_delay',
    title: `Payment stuck in processing: ${payment.id}`,
    payment_id: payment.id,
    booking_id: payment.booking_id
  });
}

// Overdue booking without return
if (booking.status === 'overdue' && booking.end_at < now() - hours(48)) {
  createIncident({
    severity: 'p2',
    type: 'customer_issue',
    subtype: 'tool_not_returned',
    title: `Tool not returned 48h overdue: ${booking.booking_number}`,
    booking_id: booking.id,
    user_id: booking.user_id
  });
}
```

---

### Maintenance Windows

**Scheduled maintenance creates incidents:**
```json
{
  "type": "scheduled_maintenance",
  "status": "open",
  "scheduled_start": "2024-12-28T02:00:00Z",
  "scheduled_end": "2024-12-28T04:00:00Z",
  "affected_resources": ["all_lockers"],
  "impact": "All bookings between 02:00-04:00 blocked",
  "notification": {
    "customers_notified": 45,
    "notification_sent_at": "2024-12-20T10:00:00Z"
  }
}
```

---

## Summary

**Incident management ensures:**
1. ✅ Fast response times via SLA tracking
2. ✅ Clear escalation paths
3. ✅ Documented resolution procedures
4. ✅ Customer communication at every step
5. ✅ Post-mortem learning
6. ✅ Proactive monitoring

**Every incident includes:**
- Severity classification
- SLA timer
- Assignment tracking
- Communication log
- Resolution documentation
- Lessons learned
