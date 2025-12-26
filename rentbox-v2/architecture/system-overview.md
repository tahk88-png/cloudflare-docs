# Rentbox v2 - System Architecture Overview

High-level architecture and system design for the production-grade tool rental platform.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Web App    │  │  Mobile App  │  │  Admin App   │         │
│  │  (Next.js)   │  │  (React      │  │  (Next.js)   │         │
│  │              │  │   Native)    │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                 │
│         └─────────────────┼──────────────────┘                 │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTPS / WSS
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────┐         │
│  │         Cloudflare / Vercel Edge                  │         │
│  │  - DDoS Protection                                │         │
│  │  - Rate Limiting                                  │         │
│  │  - CDN / Static Assets                            │         │
│  │  - TLS Termination                                │         │
│  └────────────────────────┬──────────────────────────┘         │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    APPLICATION LAYER                            │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────┐         │
│  │              API Server (NestJS)                  │         │
│  │  ┌────────────────────────────────────────────┐  │         │
│  │  │        Core Services                       │  │         │
│  │  │  - Booking Service                         │  │         │
│  │  │  - Payment Service                         │  │         │
│  │  │  - User Service                            │  │         │
│  │  │  - Notification Service                    │  │         │
│  │  │  - Locker Service                          │  │         │
│  │  └────────────────────────────────────────────┘  │         │
│  └────────────────────────┬──────────────────────────┘         │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────┐         │
│  │          Background Workers (BullMQ)              │         │
│  │  - Booking Expiration                             │         │
│  │  - Status Transitions                             │         │
│  │  - Overdue Detection                              │         │
│  │  - Notification Queue                             │         │
│  │  - Report Generation                              │         │
│  └────────────────────────┬──────────────────────────┘         │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                      DATA LAYER                                 │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────┐         │
│  │           PostgreSQL 15+ (Primary)                │         │
│  │  - All transactional data                         │         │
│  │  - Strict ACID compliance                         │         │
│  │  - Row-level security (optional)                  │         │
│  └────────────────────────┬──────────────────────────┘         │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────┐         │
│  │         PostgreSQL (Read Replicas)                │         │
│  │  - Reports & Analytics                            │         │
│  │  - Reduce primary load                            │         │
│  └───────────────────────────────────────────────────┘         │
│                                                                 │
│  ┌───────────────────────────────────────────────────┐         │
│  │              Redis 7+ (Cache & Queue)             │         │
│  │  - Session storage                                │         │
│  │  - Rate limiting                                  │         │
│  │  - Locks (prevent double booking)                 │         │
│  │  - Job queue (BullMQ)                             │         │
│  │  - Real-time pub/sub                              │         │
│  └───────────────────────────────────────────────────┘         │
│                                                                 │
│  ┌───────────────────────────────────────────────────┐         │
│  │         Object Storage (Cloudflare R2)            │         │
│  │  - Product images                                 │         │
│  │  - Return photos                                  │         │
│  │  - Invoices (PDF)                                 │         │
│  │  - Backups                                        │         │
│  └───────────────────────────────────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Payment    │  │  Email/SMS   │  │   Identity   │         │
│  │   Provider   │  │   Provider   │  │  Verification│         │
│  │  (Stripe)    │  │ (Resend/     │  │  (Smart-ID)  │         │
│  │              │  │  Twilio)     │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Locker     │  │  Monitoring  │  │     AI       │         │
│  │   Hardware   │  │   (Sentry/   │  │   (OpenAI)   │         │
│  │  (MQTT/HTTP) │  │  Grafana)    │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Booking Creation

```
┌──────────┐                                           ┌──────────┐
│  Client  │                                           │  Server  │
└─────┬────┘                                           └────┬─────┘
      │                                                     │
      │  1. POST /api/v2/bookings                          │
      │     {product_id, start_at, end_at, ...}            │
      ├────────────────────────────────────────────────────>│
      │                                                     │
      │                                    2. Begin Transaction
      │                                    ────────────┐    │
      │                                                │    │
      │                             3. Check availability   │
      │                                (w/ row lock)  │    │
      │                                                │    │
      │                             4. Exclusion constraint │
      │                                check passes    │    │
      │                                                │    │
      │                             5. Create booking  │    │
      │                                                │    │
      │                             6. Generate PINs   │    │
      │                                                │    │
      │                             7. Commit Transaction
      │                                ◄───────────────┘    │
      │                                                     │
      │                                   8. Queue notification
      │                                      job             │
      │                                                     │
      │  9. Response: {booking: {...}, status: 'pending'}  │
      │◄────────────────────────────────────────────────────┤
      │                                                     │
      │                                                     │
      │ 10. POST /api/v2/agreements/sign                   │
      ├────────────────────────────────────────────────────>│
      │                                                     │
      │ 11. Response: {agreement: {...}}                   │
      │◄────────────────────────────────────────────────────┤
      │                                                     │
      │                                                     │
      │ 12. POST /api/v2/payments/create                   │
      ├────────────────────────────────────────────────────>│
      │                                                     │
      │ 13. Response: {payment_url: '...'}                 │
      │◄────────────────────────────────────────────────────┤
      │                                                     │
      │                                                     │
      │ 14. User redirected to payment provider            │
      │                                                     │
      │                                                     │
┌─────▼────────────┐                                 ┌──┴──────────┐
│  Payment Provider│                                 │  Webhook    │
└─────┬────────────┘                                 └──┬──────────┘
      │                                                  │
      │ 15. User completes payment                       │
      │                                                  │
      │                                                  │
      │  16. POST /api/v2/payments/webhook               │
      │      {payment.succeeded}                         │
      ├──────────────────────────────────────────────────>│
      │                                                  │
      │                              17. Verify signature│
      │                              18. Update booking  │
      │                                  (pending → paid)│
      │                              19. Generate access │
      │                                  codes           │
      │                              20. Send confirmation
      │                                  email           │
      │                                                  │
      │  21. Response: 200 OK                            │
      │◄──────────────────────────────────────────────────┤
      │                                                  │
```

---

## Component Interactions

### 1. Booking Service

**Responsibilities:**
- Create/read/update bookings
- Validate availability
- Manage booking lifecycle
- Calculate pricing
- Generate access codes

**Dependencies:**
- Database (PostgreSQL)
- Cache (Redis) - for locks
- Locker Service - for compartment status
- Payment Service - for payment validation
- Notification Service - for customer communication

**Key Methods:**
```typescript
class BookingService {
  async create(data: CreateBookingDto): Promise<Booking>
  async findById(id: string): Promise<Booking>
  async checkAvailability(params: AvailabilityParams): Promise<AvailabilityResult>
  async extend(bookingId: string, newEndAt: Date): Promise<Booking>
  async cancel(bookingId: string, reason: string): Promise<Booking>
  async transitionToActive(bookingId: string): Promise<Booking>
  async transitionToOverdue(bookingId: string): Promise<Booking>
}
```

---

### 2. Payment Service

**Responsibilities:**
- Process payments via provider
- Handle webhooks
- Manage refunds
- Generate invoices

**Dependencies:**
- Payment provider API (Stripe)
- Database (PostgreSQL)
- Notification Service

**Key Methods:**
```typescript
class PaymentService {
  async createPaymentIntent(bookingId: string): Promise<PaymentIntent>
  async handleWebhook(event: WebhookEvent): Promise<void>
  async refund(paymentId: string, amount: number): Promise<Refund>
  async generateInvoice(bookingId: string): Promise<Invoice>
}
```

---

### 3. Locker Service

**Responsibilities:**
- Communicate with physical lockers
- Open/close compartments
- Monitor locker status
- Log all access attempts

**Dependencies:**
- MQTT broker / HTTP API
- Database (PostgreSQL) - for access logs
- Incident Service - for hardware failures

**Key Methods:**
```typescript
class LockerService {
  async openCompartment(compartmentId: string): Promise<void>
  async closeCompartment(compartmentId: string): Promise<void>
  async getLockerStatus(lockerId: string): Promise<LockerStatus>
  async testCompartment(compartmentId: string): Promise<TestResult>
}
```

---

### 4. Notification Service

**Responsibilities:**
- Send email/SMS notifications
- Manage notification queue
- Track delivery status
- Handle retries

**Dependencies:**
- Email provider (Resend)
- SMS provider (Twilio)
- Queue (BullMQ/Redis)
- Database (PostgreSQL) - for logs

**Key Methods:**
```typescript
class NotificationService {
  async send(params: NotificationParams): Promise<void>
  async queue(params: NotificationParams): Promise<void>
  async getDeliveryStatus(notificationId: string): Promise<DeliveryStatus>
}
```

---

## Scalability Considerations

### Horizontal Scaling

**Stateless API Servers:**
- Run multiple instances behind load balancer
- No local state (use Redis for sessions)
- Scale up/down based on traffic

**Worker Processes:**
- Separate worker pools for different job types
- Scale workers independently of API
- Long-running jobs don't block API

### Database Scaling

**Read Replicas:**
- Separate read-only replicas for reports
- Route analytics queries to replicas
- Reduce load on primary

**Connection Pooling:**
- Limit connections per app instance
- Use PgBouncer for connection pooling
- Prevent connection exhaustion

**Query Optimization:**
- Proper indexes on all foreign keys
- Composite indexes for common queries
- Regular VACUUM and ANALYZE

---

## High Availability

### Database HA
- Primary-standby replication
- Automatic failover (< 30s)
- Point-in-time recovery
- Daily backups retained for 30 days

### Application HA
- Multiple availability zones
- Health checks every 30s
- Automatic restart on failure
- Rolling deploys (zero downtime)

### External Dependencies
- Circuit breakers for external APIs
- Graceful degradation when dependencies fail
- Fallback mechanisms (e.g., manual locker access)

---

## Security Architecture

### Network Security
- TLS 1.3 for all external communication
- Private network for internal services
- Firewall rules (allowlist approach)
- DDoS protection (Cloudflare)

### Application Security
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation (Zod schemas)
- Output encoding (prevent XSS)
- Parameterized queries (prevent SQL injection)

### Data Security
- Encryption at rest (database, object storage)
- Encryption in transit (TLS)
- PII encryption (customer data)
- Secure key management (environment variables, KMS)

---

## Deployment Architecture

### Environments

**Production:**
- Region: EU (GDPR compliance)
- Database: Managed PostgreSQL (2 replicas)
- Cache: Managed Redis (3 nodes, cluster mode)
- API: 4+ instances (auto-scale)
- Workers: 2+ instances per queue

**Staging:**
- Mirrors production config
- Smaller instance sizes
- Subset of production data
- Payment provider in test mode

**Development:**
- Local Docker Compose stack
- Hot-reload enabled
- Debug logging
- Mock external services

---

## Monitoring & Observability

### Metrics (Prometheus)
- Request rate, latency, errors
- Database connection pool usage
- Queue depth and processing time
- Locker ping latency

### Logs (Loki)
- Structured JSON logs
- Request tracing (request_id)
- Error tracking with stack traces
- Audit logs for sensitive actions

### Traces (Jaeger)
- Distributed tracing for slow requests
- Service dependency mapping
- Performance bottleneck identification

### Alerts
- P0: Page on-call (system down)
- P1: Alert ops team (degraded service)
- P2: Slack notification (feature broken)
- P3: Email (minor issue)

---

## Disaster Recovery

### Backup Strategy
- Database: Continuous backup + daily snapshots
- Object storage: Versioning enabled
- Config: Infrastructure as code (IaC)
- Secrets: Encrypted backup in vault

### Recovery Procedures
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 5 minutes
- Documented runbooks for common scenarios
- Quarterly DR drills

---

## Cost Optimization

### Database
- Archive old bookings to cold storage (>2 years)
- Use read replicas for analytics (reduce primary load)
- Right-size instances based on actual usage

### API & Workers
- Auto-scale based on demand
- Scale to zero during low traffic (dev/staging)
- Use spot instances for non-critical workers

### Storage
- Lifecycle policies (move to cold storage after 90 days)
- Image optimization (WebP format, compression)
- CDN caching (reduce origin requests)

---

## Future Enhancements

### Phase 2
- Mobile apps (iOS, Android)
- GPS tracking for high-value tools
- In-app chat support
- Loyalty program

### Phase 3
- Multi-currency support
- International expansion
- Franchise management
- B2B portal with bulk pricing

### Phase 4
- IoT integration (smart tools)
- Predictive maintenance (ML)
- Dynamic pricing
- Marketplace model (tool owners can list)

---

## Summary

**System ensures:**
1. ✅ Scalability (horizontal scaling)
2. ✅ Reliability (99.9% uptime)
3. ✅ Security (defense in depth)
4. ✅ Observability (comprehensive monitoring)
5. ✅ Maintainability (clean architecture)
6. ✅ Cost efficiency (right-sized resources)

**Key architectural decisions:**
- Microservices-like structure within monolith
- Event-driven for async operations
- Database as source of truth
- Stateless API for easy scaling
- Fail-safe mechanisms at every layer
