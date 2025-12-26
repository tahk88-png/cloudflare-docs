# Rentbox v2 - Implementation Guide

Step-by-step guide to implementing the Rentbox v2 platform from architecture to production.

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

#### Week 1: Project Setup & Infrastructure

**Backend:**
```bash
# Initialize NestJS project
npm install -g @nestjs/cli
nest new rentbox-api
cd rentbox-api

# Install core dependencies
npm install @nestjs/config @nestjs/typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install class-validator class-transformer
npm install bcrypt @types/bcrypt
npm install redis @nestjs/bull bull

# Dev dependencies
npm install -D prisma @types/node
npx prisma init
```

**Frontend:**
```bash
# Initialize Next.js project
npx create-next-app@latest rentbox-web --typescript --tailwind --app
cd rentbox-web

# Install core dependencies
npm install @tanstack/react-query zustand
npm install react-hook-form zod @hookform/resolvers/zod
npm install date-fns
npm install lucide-react

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog form input calendar
```

**Database:**
```bash
# Apply schema
psql -U postgres -d rentbox_dev < database/schema.sql

# Or with Prisma
npx prisma migrate dev --name init
```

**Deliverables:**
- ✅ Project scaffolding
- ✅ Database schema created
- ✅ Development environment running
- ✅ CI/CD pipeline configured

---

#### Week 2: Core Models & Authentication

**Tasks:**
1. Implement User model with authentication
2. Create JWT auth guards
3. Implement RBAC system
4. Create user registration/login endpoints
5. Add password reset flow

**Key Files:**
```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── jwt.strategy.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── roles.guard.ts
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── entities/
│       └── user.entity.ts
```

**Tests:**
```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  it('should hash passwords correctly', async () => {
    const password = 'Test123!';
    const hashed = await authService.hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(await authService.verifyPassword(password, hashed)).toBe(true);
  });
  
  it('should generate valid JWT tokens', async () => {
    const user = { id: 'uuid', email: 'test@example.com', role: 'customer' };
    const token = authService.generateToken(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.user_id).toBe(user.id);
  });
});
```

**Deliverables:**
- ✅ User registration & login working
- ✅ JWT authentication implemented
- ✅ Role-based access control working
- ✅ Password reset flow functional

---

#### Week 3: Product & Location Management

**Tasks:**
1. Create Product model
2. Create Location model
3. Create Locker & Compartment models
4. Implement admin CRUD for products
5. Implement admin CRUD for locations

**API Endpoints:**
```typescript
// Products
GET    /api/v2/products
GET    /api/v2/products/:slug
POST   /api/v2/admin/products
PATCH  /api/v2/admin/products/:id
DELETE /api/v2/admin/products/:id

// Locations
GET    /api/v2/locations
GET    /api/v2/locations/:slug
POST   /api/v2/admin/locations
PATCH  /api/v2/admin/locations/:id
```

**Deliverables:**
- ✅ Product catalog browsable
- ✅ Location listings working
- ✅ Admin can manage products
- ✅ Admin can manage locations

---

#### Week 4: Availability Engine

**Tasks:**
1. Implement availability checking algorithm
2. Add exclusion constraint to database
3. Create "next available" slot finder
4. Implement pricing calculator
5. Add availability API endpoints

**Critical Implementation:**
```typescript
// booking.service.ts
async checkAvailability(params: AvailabilityParams): Promise<AvailabilityResult> {
  // Use database exclusion constraint
  const conflicts = await this.db.bookings.findMany({
    where: {
      compartment_id: params.compartmentId,
      start_at: { lt: params.endAt },
      end_at: { gt: params.startAt },
      status: { notIn: ['cancelled', 'expired'] }
    }
  });
  
  if (conflicts.length > 0) {
    // Find next available slot
    const nextAvailable = await this.findNextAvailable(params);
    return { available: false, nextAvailable };
  }
  
  return { available: true, pricing: this.calculatePricing(params) };
}
```

**Tests:**
```typescript
describe('Availability Engine', () => {
  it('should prevent double bookings', async () => {
    const slot = { start: '10:00', end: '14:00', compartmentId: 'C-01' };
    
    // First booking succeeds
    const booking1 = await bookingService.create(slot);
    expect(booking1).toBeDefined();
    
    // Second booking fails
    await expect(bookingService.create(slot)).rejects.toThrow('BOOKING_CONFLICT');
  });
  
  it('should allow adjacent bookings', async () => {
    const slot1 = { start: '10:00', end: '12:00', compartmentId: 'C-01' };
    const slot2 = { start: '12:00', end: '14:00', compartmentId: 'C-01' };
    
    await bookingService.create(slot1);
    const booking2 = await bookingService.create(slot2);
    expect(booking2).toBeDefined();
  });
});
```

**Deliverables:**
- ✅ Availability checking works correctly
- ✅ No double bookings possible
- ✅ Next available slot finder working
- ✅ Pricing calculation accurate

---

### Phase 2: Core Booking Flow (Weeks 5-8)

#### Week 5: Booking Creation & Payment

**Tasks:**
1. Implement booking creation endpoint
2. Integrate payment provider (Stripe)
3. Create payment webhook handler
4. Implement booking status transitions
5. Add idempotency keys

**Critical Files:**
```typescript
// payment.service.ts
async createPaymentIntent(bookingId: string): Promise<PaymentIntent> {
  const booking = await this.bookingService.findById(bookingId);
  
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount: booking.total_due,
    currency: 'eur',
    metadata: {
      booking_id: bookingId,
      booking_number: booking.booking_number
    },
    idempotency_key: `payment-${bookingId}`
  });
  
  await this.db.payments.create({
    data: {
      booking_id: bookingId,
      amount: booking.total_due,
      provider: 'stripe',
      provider_transaction_id: paymentIntent.id,
      status: 'pending'
    }
  });
  
  return paymentIntent;
}

async handleWebhook(event: Stripe.Event): Promise<void> {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const bookingId = paymentIntent.metadata.booking_id;
    
    // Update payment status
    await this.db.payments.update({
      where: { provider_transaction_id: paymentIntent.id },
      data: { status: 'completed', completed_at: new Date() }
    });
    
    // Transition booking to paid
    await this.bookingService.transitionToPaid(bookingId);
    
    // Send confirmation notification
    await this.notificationService.send({
      userId: booking.user_id,
      template: 'booking_confirmed',
      data: { booking }
    });
  }
}
```

**Deliverables:**
- ✅ Booking creation working
- ✅ Payment integration functional
- ✅ Webhook handling secure
- ✅ Status transitions correct

---

#### Week 6: Digital Signing

**Tasks:**
1. Implement typed signature
2. Integrate Smart-ID for Estonia
3. Create agreement generation
4. Add signature verification
5. Store signed contracts

**Implementation:**
```typescript
// agreement.service.ts
async sign(bookingId: string, params: SignatureParams): Promise<RentalAgreement> {
  const booking = await this.bookingService.findById(bookingId);
  
  // Generate agreement content
  const content = await this.generateAgreementContent(booking);
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');
  
  // Validate signature based on type
  if (params.type === 'typed') {
    await this.validateTypedSignature(params.value, booking.user);
  } else if (params.type === 'smart_id') {
    await this.processSmartIdSignature(params);
  }
  
  // Store agreement
  return await this.db.rentalAgreements.create({
    data: {
      booking_id: bookingId,
      user_id: booking.user_id,
      signature_type: params.type,
      signature_value: params.value,
      terms_html: content,
      terms_version: TERMS_VERSION,
      content_hash: contentHash,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      signed_at: new Date()
    }
  });
}
```

**Deliverables:**
- ✅ Typed signatures working
- ✅ Smart-ID integration complete
- ✅ Contracts legally binding
- ✅ Audit trail complete

---

#### Week 7: Locker Integration

**Tasks:**
1. Set up MQTT broker
2. Implement locker communication service
3. Add retry and timeout logic
4. Create access logging
5. Implement fallback mechanisms

**Implementation:**
```typescript
// locker.service.ts
async openCompartment(compartmentId: string, bookingId: string): Promise<void> {
  const compartment = await this.db.compartments.findUnique({
    where: { id: compartmentId },
    include: { locker: true }
  });
  
  // Check booking authorization
  const booking = await this.bookingService.findById(bookingId);
  if (booking.status !== 'active' && booking.status !== 'paid') {
    throw new ForbiddenException('Booking not active');
  }
  
  // Attempt to open with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await this.sendMqttCommand(compartment.locker.mqtt_topic, {
        action: 'open',
        compartment: compartment.number
      });
      
      // Log successful access
      await this.logAccess({
        booking_id: bookingId,
        compartment_id: compartmentId,
        action: 'open',
        success: true,
        method: 'mqtt'
      });
      
      return;
    } catch (error) {
      if (attempt === 3) {
        // Create incident
        await this.incidentService.create({
          severity: 'p0',
          type: 'hardware_failure',
          compartment_id: compartmentId,
          booking_id: bookingId,
          description: `Failed to open compartment after 3 attempts`
        });
        
        throw new ServiceUnavailableException('Locker communication failed');
      }
      
      await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}
```

**Deliverables:**
- ✅ Locker communication working
- ✅ Retry logic functional
- ✅ Access logging complete
- ✅ Incident creation on failure

---

#### Week 8: Background Jobs & Cron

**Tasks:**
1. Set up BullMQ queues
2. Implement booking expiration job
3. Implement status transition job
4. Implement overdue detection job
5. Implement notification queue

**Implementation:**
```typescript
// booking-expiration.processor.ts
@Processor('booking-expiration')
export class BookingExpirationProcessor {
  @Process()
  async handleExpiration(job: Job) {
    const expiredBookings = await this.db.bookings.findMany({
      where: {
        status: 'pending',
        created_at: { lt: subMinutes(new Date(), 15) }
      }
    });
    
    for (const booking of expiredBookings) {
      await this.bookingService.expire(booking.id);
      this.logger.log(`Expired booking ${booking.booking_number}`);
    }
    
    return { processed: expiredBookings.length };
  }
}

// Cron schedule
@Cron('*/1 * * * *') // Every minute
async checkExpirations() {
  await this.bookingExpirationQueue.add('expire', {});
}
```

**Deliverables:**
- ✅ Booking expiration automated
- ✅ Status transitions automated
- ✅ Overdue detection working
- ✅ Notification queue processing

---

### Phase 3: Return & Support (Weeks 9-12)

#### Week 9: Return Flow

**Tasks:**
1. Implement return initiation endpoint
2. Add photo upload functionality
3. Create auto-verification logic
4. Implement manual verification UI
5. Add dispute handling

**Deliverables:**
- ✅ Return process functional
- ✅ Photo upload working
- ✅ Auto-verification accurate
- ✅ Manual review workflow complete

---

#### Week 10: Notification System

**Tasks:**
1. Integrate email provider (Resend)
2. Integrate SMS provider (Twilio)
3. Create notification templates
4. Implement delivery tracking
5. Add retry logic

**Deliverables:**
- ✅ Email notifications sending
- ✅ SMS notifications sending
- ✅ Templates manageable
- ✅ Delivery tracking working

---

#### Week 11: Incident Management

**Tasks:**
1. Create incident model & CRUD
2. Implement SLA tracking
3. Create incident assignment logic
4. Build incident dashboard
5. Add resolution workflow

**Deliverables:**
- ✅ Incident creation working
- ✅ SLA tracking automatic
- ✅ Assignment functional
- ✅ Dashboard visible to ops

---

#### Week 12: Admin Dashboard

**Tasks:**
1. Build admin dashboard UI
2. Create booking management views
3. Add user management
4. Create reports & analytics
5. Build incident management UI

**Deliverables:**
- ✅ Admin dashboard functional
- ✅ All CRUD operations working
- ✅ Reports generating correctly
- ✅ Incident management complete

---

### Phase 4: Polish & Production (Weeks 13-16)

#### Week 13: Frontend Polish

**Tasks:**
1. Implement responsive design
2. Add loading states & skeletons
3. Improve error handling & messages
4. Add accessibility features
5. Optimize performance

**Deliverables:**
- ✅ Mobile-friendly
- ✅ Fast page loads
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Good UX throughout

---

#### Week 14: Testing & QA

**Tasks:**
1. Write unit tests (>80% coverage)
2. Write integration tests
3. Write E2E tests (Playwright)
4. Load testing (k6)
5. Security audit

**Tests:**
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Load test
k6 run tests/load/booking-creation.js
```

**Deliverables:**
- ✅ Test coverage >80%
- ✅ All critical paths tested
- ✅ Load test passed (1000 RPS)
- ✅ Security vulnerabilities fixed

---

#### Week 15: Monitoring & Observability

**Tasks:**
1. Set up Prometheus & Grafana
2. Configure Sentry error tracking
3. Create dashboards
4. Set up alerting rules
5. Create runbooks

**Deliverables:**
- ✅ Metrics collecting
- ✅ Errors tracked
- ✅ Dashboards created
- ✅ Alerts configured

---

#### Week 16: Production Launch

**Tasks:**
1. Final security review
2. Performance optimization
3. Documentation review
4. Staging deployment
5. Production deployment

**Launch Checklist:**
- [ ] Database backups configured
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Monitoring alerts active
- [ ] On-call rotation scheduled
- [ ] Rollback plan documented
- [ ] Customer support trained
- [ ] Marketing materials ready

**Deliverables:**
- ✅ Production system live
- ✅ Monitoring active
- ✅ Documentation complete
- ✅ Team trained

---

## Technology Choices

### Backend Framework: NestJS
**Why:**
- TypeScript-first
- Dependency injection
- Built-in testing utilities
- Scalable architecture
- Great documentation

### Frontend Framework: Next.js
**Why:**
- React with SSR
- Excellent SEO
- API routes
- Image optimization
- Fast page loads

### Database: PostgreSQL
**Why:**
- ACID compliance
- Advanced features (exclusion constraints)
- JSON support
- Excellent performance
- Proven reliability

### Cache: Redis
**Why:**
- In-memory speed
- Pub/sub for real-time
- TTL support
- Atomic operations
- Queue support

---

## Deployment

### Infrastructure (Terraform)

```hcl
# main.tf
resource "digitalocean_droplet" "api" {
  image    = "ubuntu-22-04-x64"
  name     = "rentbox-api-prod"
  region   = "fra1"
  size     = "s-2vcpu-4gb"
  ssh_keys = [var.ssh_key_id]
}

resource "digitalocean_database_cluster" "postgres" {
  name       = "rentbox-db-prod"
  engine     = "pg"
  version    = "15"
  size       = "db-s-2vcpu-4gb"
  region     = "fra1"
  node_count = 2
}

resource "digitalocean_database_cluster" "redis" {
  name       = "rentbox-cache-prod"
  engine     = "redis"
  version    = "7"
  size       = "db-s-1vcpu-2gb"
  region     = "fra1"
  node_count = 1
}
```

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: rentbox_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  
  api:
    build: ./rentbox-api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/rentbox_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    command: npm run start:dev

volumes:
  postgres_data:
```

---

## Performance Targets

### Response Times (P95)
- Homepage: <500ms
- Product listing: <500ms
- Booking creation: <1s
- Payment processing: <2s
- API endpoints: <200ms

### Availability
- Uptime: 99.9% (43.2 min/month)
- Error rate: <0.1%
- Success rate: >99%

### Scale
- Concurrent users: 1,000
- Bookings per day: 10,000
- API requests: 1,000 RPS

---

## Launch Preparation

### Pre-Launch Checklist

**Technical:**
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] SSL certificates valid
- [ ] DNS configured
- [ ] CDN configured

**Business:**
- [ ] Terms of service finalized
- [ ] Privacy policy published
- [ ] Pricing confirmed
- [ ] Support email configured
- [ ] Customer support trained
- [ ] Marketing site live

**Operations:**
- [ ] On-call rotation scheduled
- [ ] Runbooks documented
- [ ] Incident response tested
- [ ] Communication plan ready

---

## Post-Launch

### Week 1
- Monitor metrics continuously
- Address any P0/P1 incidents immediately
- Collect user feedback
- Fix critical bugs

### Month 1
- Analyze usage patterns
- Optimize based on real data
- Implement quick wins
- Plan Phase 2 features

### Ongoing
- Weekly metrics review
- Monthly retrospectives
- Quarterly planning
- Continuous improvement

---

## Success Metrics

**Technical:**
- 99.9% uptime achieved
- <500ms P95 response time
- Zero data loss
- <1% error rate

**Business:**
- 1,000 users onboarded
- 95% booking success rate
- <2% dispute rate
- >4.5 average rating

**Operational:**
- <1h P0 resolution time
- <4h P1 resolution time
- 100% SLA compliance
- Zero security incidents

---

**This implementation guide provides a clear path from architecture to production launch. Follow the phases sequentially, and adapt timelines based on team size and complexity.**
