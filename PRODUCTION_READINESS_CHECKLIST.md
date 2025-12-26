# Rentbox v2 Production Readiness Checklist

**Release:** _______________  
**Date:** _______________  
**Reviewed By:** _______________  
**Status:** ⬜ GO / ⬜ NO-GO

---

## PRE-LAUNCH (BLOCKERS)

### 1. Critical Endpoints Idempotency
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Payment endpoint: Execute same payment request twice → verify no duplicate charges
- [ ] Voucher endpoint: Apply same voucher code twice → verify single-use enforcement
- [ ] Locker open endpoint: Trigger same open command twice → verify no double-billing

**Command/Test:**
```bash
# Payment idempotency test
curl -X POST https://api.rentbox.com/v2/payments \
  -H "Idempotency-Key: test-$(date +%s)" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 100, "booking_id": "test-123"}' \
  && sleep 2 \
  && curl -X POST https://api.rentbox.com/v2/payments \
  -H "Idempotency-Key: test-$(date +%s)" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 100, "booking_id": "test-123"}'
# Expected: Second request returns same transaction_id, no new charge
```

---

### 2. Database Migrations Applied and Verified
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] All pending migrations listed in migration tool
- [ ] Migration status shows 0 pending migrations
- [ ] Schema version matches expected version
- [ ] Rollback tested on staging environment

**Command/Test:**
```bash
# Check migration status
# Example for different migration tools:
# - Alembic: alembic current
# - Flyway: flyway info
# - Custom: Check migration table for latest version
# Expected: No pending migrations, version matches release notes
```

---

### 3. Exclusion Constraints Active for Bookings
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Database constraint exists: `EXCLUDE USING gist (locker_id WITH =, time_range WITH &&)`
- [ ] Attempt to create overlapping booking → verify rejection
- [ ] Constraint name documented: `bookings_no_overlap`

**Command/Test:**
```sql
-- Verify constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'bookings'::regclass 
AND contype = 'x';

-- Test overlap rejection
INSERT INTO bookings (locker_id, start_time, end_time) 
VALUES (1, '2024-01-01 10:00:00', '2024-01-01 12:00:00');
INSERT INTO bookings (locker_id, start_time, end_time) 
VALUES (1, '2024-01-01 11:00:00', '2024-01-01 13:00:00');
-- Expected: Second insert fails with exclusion violation
```

---

### 4. Pending Booking TTL Enabled
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] TTL mechanism configured (Redis TTL or DB cleanup job)
- [ ] Test: Create pending booking → wait TTL duration → verify deletion
- [ ] TTL duration: _______________ minutes
- [ ] Cleanup job running and monitored

**Command/Test:**
```bash
# Verify Redis TTL or cleanup job
# Redis: redis-cli TTL booking:pending:test-123
# DB: Check cleanup job logs for successful runs
# Expected: Pending bookings expire after configured TTL
```

---

### 5. Timezone Handling Verified (Europe/Tallinn, DST)
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Application timezone set to `Europe/Tallinn`
- [ ] DST transition tested: 2024-03-31 (spring forward) and 2024-10-27 (fall back)
- [ ] Booking times stored in UTC, displayed in Europe/Tallinn
- [ ] Calendar availability correct across DST boundaries

**Command/Test:**
```bash
# Test timezone handling
# Verify env var: TZ=Europe/Tallinn
# Test booking creation at DST boundary times
# Expected: No double-booking or gaps during DST transitions
```

---

### 6. Secrets Stored Securely (No Env Leaks)
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] No secrets in environment variables (use secret manager)
- [ ] No secrets in code, config files, or logs
- [ ] Secret rotation policy documented
- [ ] Access audit: Only authorized services can read secrets

**Command/Test:**
```bash
# Scan for secrets
grep -r "password\|secret\|api_key\|token" --exclude-dir=.git \
  --exclude="*.md" . | grep -v "example\|test\|dummy"

# Check secret manager access
# AWS: aws secretsmanager list-secrets
# GCP: gcloud secrets list
# Expected: No secrets found in codebase, all in secret manager
```

---

### 7. Feature Flags Defaulted Correctly
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Production feature flags reviewed and set to safe defaults
- [ ] New features disabled by default unless explicitly enabled
- [ ] Feature flag configuration documented
- [ ] Rollback plan: Disable flags without code deploy

**Command/Test:**
```bash
# List all feature flags and their production defaults
# Expected: New features OFF, stable features ON
# Document: Feature flag name → Default value → Purpose
```

---

### 8. Backup & Restore Tested (DB + Object Storage)
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Database backup completed successfully
- [ ] Backup restore tested on isolated environment
- [ ] Object storage backup verified (S3/GCS bucket replication)
- [ ] Recovery Time Objective (RTO): _______________ minutes
- [ ] Recovery Point Objective (RPO): _______________ minutes

**Command/Test:**
```bash
# Test backup restore
# 1. Create test backup
# 2. Restore to test environment
# 3. Verify data integrity
# Expected: Restore completes within RTO, data matches source
```

---

## SECURITY

### 9. RBAC Verified Per Role
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Customer role: Can only access own bookings
- [ ] Admin role: Can access all bookings, manage lockers
- [ ] Support role: Read-only access to bookings
- [ ] Role permissions tested with each role

**Command/Test:**
```bash
# Test each role's permissions
# Customer: Attempt admin action → should fail
# Admin: Perform admin action → should succeed
# Support: Attempt write action → should fail
# Expected: Each role has correct access level
```

---

### 10. Admin Actions Logged
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Admin action logging enabled
- [ ] Log fields: timestamp, admin_id, action, resource_id, before/after state
- [ ] Logs stored in audit log system (separate from application logs)
- [ ] Log retention: _______________ days

**Command/Test:**
```bash
# Perform admin action and verify log entry
# Expected: Audit log contains entry with all required fields
```

---

### 11. Rate Limits Enabled
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Apply-code endpoint: _______________ requests/minute
- [ ] Login endpoint: _______________ requests/minute
- [ ] Locker open endpoint: _______________ requests/minute
- [ ] Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Command/Test:**
```bash
# Test rate limiting
for i in {1..20}; do
  curl -X POST https://api.rentbox.com/v2/apply-code \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"code": "TEST"}'
done
# Expected: Requests 1-N succeed, N+1 returns 429 Too Many Requests
```

---

### 12. Webhooks Signature-Verified
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] All webhook endpoints verify HMAC signature
- [ ] Signature algorithm: _______________ (e.g., SHA256)
- [ ] Test: Send webhook without signature → verify rejection
- [ ] Test: Send webhook with invalid signature → verify rejection

**Command/Test:**
```bash
# Test webhook signature verification
# Expected: Unsigned/invalid webhooks rejected with 401
```

---

### 13. GDPR: Data Retention Rules Configured
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Personal data retention policy: _______________ days
- [ ] Automated deletion job configured and tested
- [ ] User data export functionality tested
- [ ] Right to deletion (GDPR Article 17) implemented

**Command/Test:**
```bash
# Verify retention policy and deletion job
# Expected: Data older than retention period is automatically deleted
```

---

## OPERATIONS

### 14. Locker Access Service Reachable
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Health check endpoint responds: `GET /health` → 200 OK
- [ ] Connection timeout configured: _______________ seconds
- [ ] Retry logic implemented with exponential backoff
- [ ] Circuit breaker configured (opens after _______________ failures)

**Command/Test:**
```bash
# Test locker service connectivity
curl -f https://locker-service.rentbox.com/health
# Expected: 200 OK with {"status": "healthy"}
```

---

### 15. SMS + Email Providers Healthy
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] SMS provider: _______________ (e.g., Twilio, AWS SNS)
- [ ] Email provider: _______________ (e.g., SendGrid, AWS SES)
- [ ] Test SMS sent and received
- [ ] Test email sent and received
- [ ] Provider status checked (no outages)

**Command/Test:**
```bash
# Test SMS and email delivery
# Expected: Test messages received within 30 seconds
```

---

### 16. Fallback Access Tested
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Fallback mechanism documented (e.g., admin override code)
- [ ] Fallback tested: Simulate locker service failure → verify fallback works
- [ ] Fallback access logged and audited
- [ ] Fallback usage requires admin approval

**Command/Test:**
```bash
# Simulate locker service failure and test fallback
# Expected: Fallback mechanism allows locker access
```

---

### 17. Incident Logging Enabled
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Log aggregation system configured (e.g., Datadog, Splunk, CloudWatch)
- [ ] Error logs include: timestamp, request_id, user_id, error details
- [ ] Log retention: _______________ days
- [ ] Alerting configured for critical errors

**Command/Test:**
```bash
# Verify logs are being collected
# Expected: Recent application logs visible in log aggregation system
```

---

### 18. Admin Override Tested
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Admin override functionality tested
- [ ] Override actions logged in audit log
- [ ] Override requires justification/reason field
- [ ] Override notifications sent to operations team

**Command/Test:**
```bash
# Test admin override (e.g., unlock locker, cancel booking)
# Expected: Override works, logged, and auditable
```

---

## PERFORMANCE

### 19. Availability Queries Indexed
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Database indexes exist for availability queries
- [ ] Index on: `locker_id`, `start_time`, `end_time`
- [ ] Query execution plan reviewed: Uses index (not full table scan)
- [ ] Query performance: < _______________ ms (P95)

**Command/Test:**
```sql
-- Verify indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'bookings';

-- Analyze query plan
EXPLAIN ANALYZE 
SELECT * FROM bookings 
WHERE locker_id = 1 
AND start_time >= NOW() 
AND end_time <= NOW() + INTERVAL '7 days';
-- Expected: Uses index, execution time < target
```

---

### 20. Calendar Queries Paginated/Limited
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Calendar endpoints implement pagination
- [ ] Default page size: _______________ records
- [ ] Maximum page size: _______________ records
- [ ] Cursor-based or offset-based pagination implemented
- [ ] Test: Request large date range → verify pagination works

**Command/Test:**
```bash
# Test pagination
curl "https://api.rentbox.com/v2/calendar?locker_id=1&start_date=2024-01-01&end_date=2024-12-31&page=1&limit=50"
# Expected: Returns max 50 records, includes pagination metadata
```

---

### 21. Cache Warmup Executed
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Cache warmup script executed pre-launch
- [ ] Cache populated: Availability data, locker metadata, pricing rules
- [ ] Cache TTL configured: _______________ minutes
- [ ] Cache invalidation strategy documented

**Command/Test:**
```bash
# Execute cache warmup script
# Verify cache hit rate after warmup
# Expected: Cache populated, hit rate > 80% for first requests
```

---

### 22. P95 Latency Targets Met
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Load testing completed
- [ ] P95 latency targets:
  - Booking creation: < _______________ ms
  - Availability query: < _______________ ms
  - Locker open: < _______________ ms
- [ ] Load test results documented

**Command/Test:**
```bash
# Run load test and verify P95 latencies
# Expected: All endpoints meet P95 latency targets
```

---

## GO/NO-GO

### 23. Final Sign-Off Checklist
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] All PRE-LAUNCH items: ⬜ PASS
- [ ] All SECURITY items: ⬜ PASS
- [ ] All OPERATIONS items: ⬜ PASS
- [ ] All PERFORMANCE items: ⬜ PASS
- [ ] Release notes reviewed and approved
- [ ] Known issues documented

**Sign-Offs:**
- Engineering Lead: _______________ Date: _______
- Security Lead: _______________ Date: _______
- SRE Lead: _______________ Date: _______
- Product Manager: _______________ Date: _______

---

### 24. Rollback Plan Documented
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Rollback procedure documented
- [ ] Rollback tested on staging environment
- [ ] Estimated rollback time: _______________ minutes
- [ ] Data migration rollback plan (if applicable)
- [ ] Rollback decision criteria defined

**Rollback Plan Location:** _______________

---

### 25. On-Call Owner Assigned
**Status:** ⬜ PASS / ⬜ FAIL  
**Verified By:** _______________  
**Evidence:** _______________

**Verification Steps:**
- [ ] Primary on-call: _______________ (Phone: _______)
- [ ] Secondary on-call: _______________ (Phone: _______)
- [ ] On-call schedule confirmed for launch window
- [ ] Escalation path documented
- [ ] Incident response runbook reviewed

**On-Call Schedule:** _______________

---

## FINAL DECISION

**Total Items:** 25  
**Passed:** _______  
**Failed:** _______  
**Blockers:** _______

### Decision Matrix
- ⬜ **GO**: All PRE-LAUNCH items PASS, ≤2 non-blocker failures
- ⬜ **NO-GO**: Any PRE-LAUNCH item FAIL, or >2 non-blocker failures

**Final Decision:** ⬜ **GO** / ⬜ **NO-GO**

**Decision Maker:** _______________  
**Date/Time:** _______________  
**Notes:** _______________

---

## Post-Launch Monitoring

**First 24 Hours:**
- [ ] Error rate < 0.1%
- [ ] P95 latency within targets
- [ ] No critical incidents
- [ ] User feedback reviewed

**First Week:**
- [ ] Performance metrics stable
- [ ] No security incidents
- [ ] User adoption metrics reviewed
- [ ] Post-mortem scheduled (if incidents occurred)

---

**Checklist Version:** 1.0  
**Last Updated:** 2024-01-XX
