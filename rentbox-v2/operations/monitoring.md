# Monitoring & Observability

Comprehensive monitoring strategy for Rentbox v2 to ensure 99.9% uptime and rapid incident response.

## Monitoring Stack

### Core Components
- **Metrics**: Prometheus + Grafana
- **Logs**: Loki + Grafana
- **Traces**: Jaeger / OpenTelemetry
- **Uptime**: UptimeRobot / Pingdom
- **Error Tracking**: Sentry
- **APM**: New Relic / Datadog (optional)

---

## Key Metrics

### 1. Business Metrics

#### Booking Metrics
```promql
# Active bookings
sum(booking_status{status="active"})

# Booking success rate (last 24h)
rate(booking_created_total[24h]) / rate(booking_attempted_total[24h]) * 100

# Average booking value
avg(booking_total_amount{status="paid"})

# Booking funnel
booking_step_completed{step="product_selected"} /
booking_step_completed{step="checkout_started"} * 100
```

**Alerts:**
- Booking success rate <90% for >15min → P1
- Active bookings drops by >50% suddenly → P0
- No bookings created in 1 hour (during business hours) → P1

---

#### Revenue Metrics
```promql
# Revenue today
sum(payment_amount{status="completed", created_at=today()})

# Revenue per hour
rate(payment_amount{status="completed"}[1h])

# Average order value
avg(payment_amount{status="completed"})

# Refund rate
sum(payment_amount{status="refunded"}) / 
sum(payment_amount{status="completed"}) * 100
```

**Dashboards:**
- Real-time revenue ticker
- Daily/weekly/monthly revenue charts
- Revenue by location
- Revenue by product category

---

### 2. Technical Metrics

#### API Performance
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) /
rate(http_requests_total[5m]) * 100

# P95 latency
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Slow queries (>1s)
rate(db_query_duration_seconds{le="1"}[5m])
```

**Alerts:**
- Error rate >1% for >5min → P1
- P95 latency >1s for critical endpoints → P1
- P95 latency >5s for any endpoint → P2
- Request rate drops >80% suddenly → P0

---

#### Database Metrics
```promql
# Connection pool usage
pg_connection_pool_usage / pg_connection_pool_max * 100

# Query duration (P95)
histogram_quantile(0.95, pg_query_duration_seconds_bucket)

# Slow query count
rate(pg_slow_queries_total[5m])

# Deadlock count
rate(pg_deadlocks_total[5m])

# Table size growth
pg_table_size_bytes{table="bookings"}
```

**Alerts:**
- Connection pool >80% for >5min → P1
- Slow query count >10/min → P2
- Deadlocks >1/min → P1
- Database disk space <20% → P0

---

#### Cache Metrics (Redis)
```promql
# Hit rate
redis_hits_total / (redis_hits_total + redis_misses_total) * 100

# Memory usage
redis_memory_used_bytes / redis_memory_max_bytes * 100

# Connection count
redis_connected_clients

# Evicted keys
rate(redis_evicted_keys_total[5m])
```

**Alerts:**
- Cache hit rate <80% → P2
- Redis memory >90% → P1
- Redis connection failures → P0

---

### 3. Hardware Metrics (Locker Fleet)

#### Locker Health
```promql
# Online locker count
count(locker_status{status="online"})

# Offline locker count
count(locker_status{status="offline"})

# Average ping latency
avg(locker_ping_latency_ms)

# Failed access attempts
rate(locker_access_failed_total[5m])
```

**Alerts:**
- Any locker offline >30min → P1
- >3 lockers offline → P0
- Failed access rate >5% → P1
- Locker ping latency >500ms → P2

---

#### Compartment Status
```promql
# Available compartments
count(compartment_status{status="available"})

# Occupancy rate
count(compartment_status{status="occupied"}) /
count(compartment_status) * 100

# Maintenance compartments
count(compartment_status{status="maintenance"})

# Damaged compartments
count(compartment_status{status="damaged"})
```

**Alerts:**
- Available compartments <10% at any location → P1
- Damaged compartments >5% → P2

---

### 4. Customer Experience Metrics

#### User Journey
```promql
# Time to first booking (new users)
histogram_quantile(0.95, user_first_booking_duration_seconds_bucket)

# Booking creation duration
histogram_quantile(0.95, booking_creation_duration_seconds_bucket)

# Payment completion rate
count(payment_status{status="completed"}) /
count(payment_status{status=~"completed|failed"}) * 100

# Overdue rate
count(booking_status{status="overdue"}) /
count(booking_status{status=~"completed|overdue"}) * 100
```

**Targets:**
- Booking creation <30s (P95)
- Payment completion rate >98%
- Overdue rate <2%

---

#### Satisfaction Indicators
```promql
# Return completion rate
count(booking_status{status="completed"}) /
count(booking_status{status=~"active|completed|overdue"}) * 100

# Dispute rate
count(incident_type{type="customer_dispute"}) /
count(booking_status{status="completed"}) * 100

# Average rating
avg(booking_rating)

# NPS score
(count(nps_score{score=~"9|10"}) - count(nps_score{score=~"0|1|2|3|4|5|6"})) /
count(nps_score) * 100
```

---

## Dashboards

### Dashboard 1: Executive Overview

**Panels:**
1. **KPIs (4 cards)**
   - Active bookings
   - Revenue today
   - Locker fleet health (X/Y online)
   - Open incidents

2. **Revenue Chart**
   - Time series: Last 30 days
   - Comparison to previous period

3. **Booking Funnel**
   - Product view → Add to cart → Checkout → Payment → Confirmed
   - Conversion percentages

4. **Top Locations**
   - Table: Location, Bookings Today, Revenue Today, Occupancy %

5. **Alerts Feed**
   - Live feed of P0/P1 incidents

---

### Dashboard 2: Operations

**Panels:**
1. **Booking Status Distribution**
   - Pie chart: Pending, Paid, Active, Completed, Overdue, Cancelled

2. **Overdue Bookings**
   - Table: Booking #, User, Duration Overdue, Last Contact

3. **Locker Status Map**
   - Geo map with color-coded markers (green=online, red=offline)

4. **Recent Incidents**
   - Table: Incident #, Severity, Status, Time Open, Assigned To

5. **Payment Processing**
   - Success rate, failure reasons, avg processing time

---

### Dashboard 3: Engineering

**Panels:**
1. **API Performance**
   - Request rate, error rate, P95 latency
   - Breakdown by endpoint

2. **Database Performance**
   - Query duration, connection pool, slow queries
   - Table sizes

3. **Error Rate by Service**
   - Heatmap: Service × Error Type

4. **Resource Utilization**
   - CPU, memory, disk, network

5. **Deploy Events**
   - Timeline with version markers

---

### Dashboard 4: Customer Support

**Panels:**
1. **Active Rentals**
   - Table: Booking #, User, Tool, Time Remaining, Location

2. **Customer Issues**
   - Count by issue type: Access problems, Payment issues, Missing tool, etc.

3. **Response Times**
   - Average time to first response
   - Average time to resolution
   - SLA compliance %

4. **Customer Communication Log**
   - Recent notifications sent (email/SMS)
   - Delivery status

---

## Alerting Rules

### Critical Alerts (P0) - Page On-Call

```yaml
groups:
  - name: critical_alerts
    interval: 30s
    rules:
      - alert: SystemDown
        expr: up{job="rentbox-api"} == 0
        for: 1m
        annotations:
          summary: "Rentbox API is down"
          description: "API has been unreachable for 1 minute"
        labels:
          severity: p0
          
      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        annotations:
          summary: "Database is down"
          description: "PostgreSQL is unreachable"
        labels:
          severity: p0
          
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% (threshold: 5%)"
        labels:
          severity: p0
          
      - alert: BookingCreationFailing
        expr: rate(booking_created_total[15m]) == 0
        for: 15m
        annotations:
          summary: "No bookings created in 15 minutes"
          description: "Booking creation may be broken"
        labels:
          severity: p0
          time: business_hours_only
          
      - alert: PaymentProcessingDown
        expr: rate(payment_failed_total{reason="provider_error"}[5m]) > 0.5
        for: 5m
        annotations:
          summary: "Payment processing failures"
          description: "Payment provider may be down"
        labels:
          severity: p0
```

---

### High Priority Alerts (P1) - Alert Ops Team

```yaml
  - name: high_priority_alerts
    interval: 1m
    rules:
      - alert: LockerOffline
        expr: locker_status{status="offline"} == 1
        for: 30m
        annotations:
          summary: "Locker {{ $labels.locker_code }} offline"
          description: "Locker has been offline for 30 minutes"
        labels:
          severity: p1
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket{endpoint="/api/v2/bookings"}) > 1
        for: 5m
        annotations:
          summary: "High latency on booking endpoint"
          description: "P95 latency is {{ $value }}s (threshold: 1s)"
        labels:
          severity: p1
          
      - alert: DatabaseConnectionPoolHigh
        expr: pg_connection_pool_usage / pg_connection_pool_max > 0.8
        for: 5m
        annotations:
          summary: "Database connection pool at {{ $value }}%"
          description: "Connection pool usage is high"
        labels:
          severity: p1
          
      - alert: OverdueBookingsHigh
        expr: count(booking_status{status="overdue"}) > 10
        for: 10m
        annotations:
          summary: "{{ $value }} overdue bookings"
          description: "High number of overdue rentals"
        labels:
          severity: p1
```

---

### Warning Alerts (P2) - Slack Notification

```yaml
  - name: warning_alerts
    interval: 5m
    rules:
      - alert: CacheHitRateLow
        expr: redis_hit_rate < 0.8
        for: 15m
        annotations:
          summary: "Cache hit rate low: {{ $value }}%"
          description: "Redis performance degraded"
        labels:
          severity: p2
          
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.2
        for: 10m
        annotations:
          summary: "Disk space below 20%"
          description: "{{ $labels.device }} has {{ $value }}% free"
        labels:
          severity: p2
          
      - alert: SlowQueriesIncreasing
        expr: rate(pg_slow_queries_total[15m]) > 5
        for: 15m
        annotations:
          summary: "Slow queries increasing"
          description: "{{ $value }} slow queries per minute"
        labels:
          severity: p2
```

---

## Logging Strategy

### Log Levels

**ERROR** - Something failed, requires attention
```json
{
  "level": "error",
  "timestamp": "2024-12-26T10:30:15Z",
  "message": "Failed to open compartment",
  "context": {
    "booking_id": "uuid",
    "compartment_id": "uuid",
    "error": "LOCK_TIMEOUT",
    "attempts": 3
  }
}
```

**WARN** - Something unexpected but handled
```json
{
  "level": "warn",
  "timestamp": "2024-12-26T10:30:15Z",
  "message": "Payment webhook arrived after booking expired",
  "context": {
    "booking_id": "uuid",
    "payment_id": "uuid",
    "expired_at": "2024-12-26T10:15:00Z"
  }
}
```

**INFO** - Important business events
```json
{
  "level": "info",
  "timestamp": "2024-12-26T10:30:15Z",
  "message": "Booking created",
  "context": {
    "booking_id": "uuid",
    "booking_number": "BK-2024-001234",
    "user_id": "uuid",
    "product_id": "uuid",
    "total_amount": 12000
  }
}
```

**DEBUG** - Detailed execution info (dev/staging only)
```json
{
  "level": "debug",
  "timestamp": "2024-12-26T10:30:15Z",
  "message": "Availability query executed",
  "context": {
    "product_id": "uuid",
    "location_id": "uuid",
    "date_range": ["2024-12-27", "2024-12-28"],
    "query_time_ms": 45
  }
}
```

---

### Structured Logging Fields

**Required in all logs:**
- `timestamp` (ISO 8601)
- `level` (error, warn, info, debug)
- `message` (human-readable)
- `service` (api, worker, locker-service)
- `environment` (production, staging, dev)

**Request logs:**
- `request_id` (trace requests across services)
- `user_id` (if authenticated)
- `ip_address`
- `user_agent`
- `method` (GET, POST, etc.)
- `path` (/api/v2/bookings)
- `status_code` (200, 404, 500)
- `duration_ms`

**Error logs:**
- `error_code` (BOOKING_CONFLICT, PAYMENT_FAILED)
- `error_message`
- `stack_trace`
- `context` (relevant IDs, parameters)

---

### Log Queries (Loki)

**Find all errors in last hour:**
```logql
{service="rentbox-api", level="error"} |= "" | json
```

**Trace a specific request:**
```logql
{request_id="req_abc123"} | json
```

**Failed booking attempts:**
```logql
{service="rentbox-api"} |= "booking" |= "failed" | json
```

**Payment webhook errors:**
```logql
{service="rentbox-api", path="/api/v2/payments/webhook"} | json | status_code >= 400
```

---

## Tracing

### Distributed Tracing Setup

**Trace important workflows:**
1. Booking creation
2. Payment processing
3. Locker access
4. Return flow

**Example: Booking Creation Trace**
```
Span 1: HTTP POST /api/v2/bookings (total: 850ms)
├─ Span 2: Validate input (5ms)
├─ Span 3: Check availability (120ms)
│  ├─ Span 4: DB query: Get conflicting bookings (45ms)
│  └─ Span 5: Redis: Check pending locks (30ms)
├─ Span 6: Create booking (200ms)
│  ├─ Span 7: DB transaction (180ms)
│  └─ Span 8: Generate booking number (5ms)
├─ Span 9: Generate access PINs (50ms)
├─ Span 10: Create rental agreement (80ms)
└─ Span 11: Send confirmation notification (400ms)
   ├─ Span 12: Render email template (50ms)
   └─ Span 13: Call email provider (350ms)
```

**Trace attributes:**
- `booking.id`
- `booking.number`
- `user.id`
- `product.id`
- `location.id`
- `db.query` (for DB spans)
- `http.method` (for HTTP spans)

---

## Health Checks

### Service Health Endpoints

**GET /health**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-26T10:30:15Z",
  "uptime_seconds": 3600,
  "version": "2.0.5"
}
```

**GET /health/detailed**
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 5
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 2
    },
    "locker_broker": {
      "status": "healthy",
      "connected_lockers": 8
    },
    "payment_provider": {
      "status": "healthy"
    }
  },
  "timestamp": "2024-12-26T10:30:15Z"
}
```

**Response Codes:**
- `200` - All healthy
- `503` - One or more dependencies unhealthy

---

## On-Call Runbook

### On-Call Rotation
- **Primary**: 24/7 coverage
- **Secondary**: Backup escalation
- **Rotation**: Weekly
- **Handoff**: Monday 9:00 AM

### On-Call Responsibilities
1. Respond to P0/P1 alerts within SLA
2. Triage and escalate as needed
3. Update incident status
4. Communicate with customers (P0 only)
5. Document resolution in incident

### Alert Response Checklist

**When paged:**
1. ☐ Acknowledge alert (stop paging)
2. ☐ Check dashboard for context
3. ☐ Review recent deployments
4. ☐ Check #incidents Slack channel
5. ☐ Assess severity
6. ☐ Begin investigation

**During incident:**
7. ☐ Update incident status (Investigating)
8. ☐ Post updates every 15min (P0) or 1h (P1)
9. ☐ Engage other engineers if needed
10. ☐ Document steps taken

**After resolution:**
11. ☐ Mark incident Resolved
12. ☐ Monitor for 30 minutes
13. ☐ Mark incident Closed
14. ☐ Write post-mortem (P0/P1)
15. ☐ Update runbook if needed

---

## SLIs & SLOs

### Service Level Indicators

**Availability SLI:**
```
successful_requests / total_requests
Target: 99.9% (43.2 minutes downtime/month)
```

**Latency SLI:**
```
requests_under_500ms / total_requests
Target: 95% of requests <500ms
```

**Booking Success SLI:**
```
bookings_completed / bookings_attempted
Target: 95% success rate
```

**Locker Access SLI:**
```
successful_access_attempts / total_access_attempts
Target: 99% first-attempt success
```

---

### Error Budgets

**Monthly error budget:**
- Total requests: 10,000,000
- Allowed errors: 10,000 (0.1%)
- Current errors: 2,500 (0.025%)
- Budget remaining: 75%

**Actions when budget exhausted:**
1. Halt non-critical releases
2. Focus on reliability improvements
3. Conduct incident reviews
4. Identify and fix top error sources

---

## Summary

**Monitoring ensures:**
1. ✅ 24/7 visibility into system health
2. ✅ Rapid incident detection (<5min for P0)
3. ✅ Clear escalation paths
4. ✅ Actionable alerts (not noise)
5. ✅ Data-driven decision making
6. ✅ Continuous improvement via SLOs

**Key dashboards:**
- Executive: Business metrics
- Operations: Day-to-day monitoring
- Engineering: Technical deep-dive
- Support: Customer issues

**Alert philosophy:**
- P0: Human must act immediately
- P1: Human must act within hours
- P2: Human should investigate today
- P3: Track, address in next sprint
