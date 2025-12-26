# Rentbox v2 Architecture

**Production-grade, 24/7 self-service tool rental platform**

## Core Principles (Non-Negotiable)

- **Availability is time-based, not stock-based**
- **Server + database are the source of truth**
- **No double bookings under any condition**
- **Physical access is logged and auditable**
- **Users stay in control; AI assists only**
- **System must work unattended 24/7**

---

## System Architecture

### Technology Stack

**Frontend:**
- Next.js 15+ (App Router, SSR for SEO + speed)
- Tailwind CSS 4+
- shadcn/ui components
- React Hook Form + Zod validation
- TanStack Query for data fetching
- Zustand for client state

**Backend:**
- NestJS (modular, TypeScript-first)
- PostgreSQL 15+ (timestamptz everywhere)
- Redis (distributed locks, TTL, caching)
- Prisma ORM (type-safe, migrations)
- BullMQ (job queues for notifications, cleanup)

**Infrastructure:**
- Vercel (frontend) / Cloudflare Pages
- Railway / Render / AWS RDS (PostgreSQL)
- Upstash Redis
- Cloudflare R2 / AWS S3 (media storage)
- Twilio (SMS)
- Resend / SendGrid (Email)
- MQTT broker (locker hardware)

**Authentication:**
- NextAuth.js (OAuth + credentials)
- Smart-ID / Mobiil-ID / ID-card integration
- JWT tokens

---

## Module Architecture

### 1. Content Creation Engine

**Purpose:** Block-based editor for marketing content with AI assistance

**Components:**
- Block types: text, image, video, CTA button
- AI text improvement (clarity, tone, grammar)
- Media upload & optimization
- Preview modes (web, email, mobile)
- Version history

**Rules:**
- AI suggests, never overwrites
- Preserve meaning
- No spam language
- All changes tracked

**Database:**
- `content_pages` (id, slug, title, status, created_at, updated_at)
- `content_blocks` (id, page_id, type, order, data JSONB, version)
- `content_versions` (id, page_id, snapshot JSONB, created_at, author_id)

---

### 2. Product & Catalog System

**Purpose:** Tool inventory with pricing, availability, SEO

**Components:**
- Product CRUD
- Pricing (hour/day rates)
- Deposit management
- Location-aware availability
- SEO product pages

**Database:**
- `products` (id, name, slug, description, category, images, seo_meta)
- `product_pricing` (id, product_id, duration_type, price, deposit, currency)
- `product_locations` (id, product_id, locker_id, compartment_id, quantity)
- `product_categories` (id, name, slug, parent_id)

---

### 3. Booking Engine (TIME-BASED)

**Purpose:** Core rental logic with conflict prevention

**Components:**
- Time-based bookings (start_at → end_at)
- Compartment assignment
- Status lifecycle management
- Pending TTL locking
- Extension logic
- Overdue detection + fees

**Status Lifecycle:**
```
pending → paid → active → completed
                ↓
            overdue / cancelled / expired
```

**Hard Rule:** No overlapping bookings per compartment (DB enforced)

**Database:**
- `bookings` (id, user_id, product_id, compartment_id, start_at, end_at, status, created_at, updated_at)
- `booking_payments` (id, booking_id, amount, currency, status, payment_intent_id, paid_at)
- `booking_extensions` (id, booking_id, original_end_at, new_end_at, fee, created_at)
- `booking_overdue_fees` (id, booking_id, amount, calculated_at, paid_at)

**Constraints:**
```sql
-- Prevent overlapping bookings per compartment
CREATE UNIQUE INDEX idx_bookings_no_overlap ON bookings (compartment_id)
WHERE status IN ('paid', 'active') AND
  tsrange(start_at, end_at) && tsrange(start_at, end_at);
```

---

### 4. Calendar System

**Purpose:** Availability visualization for customers and admins

**Components:**
- Customer: Slot-based availability picker
- Customer: Duration selector
- Customer: "Next available" logic
- Admin: Timeline view (locker → compartments)
- Admin: Maintenance & block creation
- Admin: Status-colored events
- Admin: ICS export (read-only)

**Database:**
- `availability_slots` (computed view, not stored)
- `maintenance_blocks` (id, compartment_id, start_at, end_at, reason, created_by)
- `calendar_exports` (id, user_id, filter_params, ics_url, expires_at)

---

### 5. User Dashboard ("Minu Rendid")

**Purpose:** Customer self-service portal

**Components:**
- Active / upcoming / past rentals
- Countdown timers (real-time)
- Invoices & payments
- Signed agreements
- One-click "Rent again"

**Database:**
- Uses existing `bookings`, `booking_payments`, `contracts` tables

---

### 6. Checkout + Signing

**Purpose:** Legal compliance with e-signatures

**Components:**
- Explicit consent to rental terms
- Typed e-signature by default
- Smart-ID / Mobiil-ID / ID-card auto-required if:
  - High amount (>€500)
  - Long rental (>7 days)
  - B2B account
- Payment blocked until signature valid
- Immutable contract hash

**Database:**
- `contracts` (id, booking_id, terms_version, signature_type, signature_data, contract_hash, signed_at, ip_address)
- `contract_terms` (id, version, content, effective_from, created_at)

**Signature Types:**
- `typed` - User typed name
- `smart_id` - Smart-ID authentication
- `mobiil_id` - Mobiil-ID authentication
- `id_card` - Estonian ID-card

---

### 7. Locker Access Service (Hardware)

**Purpose:** Physical compartment control

**Components:**
- Open / close compartment
- Retry & timeout logic
- Fallback access (PIN / SMS)
- Full event logging

**Rules:**
- Access only if booking is active
- Hardware failures never hide booking truth
- All access attempts logged

**Database:**
- `lockers` (id, name, location, mqtt_topic, status, last_seen_at)
- `compartments` (id, locker_id, number, size, status, pin_code_hash)
- `access_events` (id, booking_id, compartment_id, action, result, method, timestamp, ip_address, metadata)

**Hardware Integration:**
- MQTT topics: `lockers/{locker_id}/compartments/{compartment_id}/open`
- HTTP fallback: `POST /api/lockers/{locker_id}/compartments/{compartment_id}/open`
- Response timeout: 10s
- Retry: 3 attempts with exponential backoff

---

### 8. Return Flow

**Purpose:** End-of-rental process with audit trail

**Components:**
- User confirms return
- Optional photo upload
- Auto overdue detection
- Admin verification
- Dispute-ready audit trail

**Database:**
- `returns` (id, booking_id, returned_at, confirmed_by_user_at, confirmed_by_admin_at, status, notes)
- `return_photos` (id, return_id, url, uploaded_at)
- `return_disputes` (id, return_id, reason, status, resolved_at, resolution_notes)

**Status Flow:**
```
pending → verified → completed
         ↓
      disputed → resolved
```

---

### 9. Notification Engine

**Purpose:** Transactional communications

**Channels:**
- Email (all events)
- SMS (critical events only)

**Events:**
- Booking confirmed
- Rental start reminder (1h before)
- Return reminder (2h before end)
- Overdue warning (immediate + hourly)
- Return confirmation

**Rules:**
- Transactional > marketing
- Retry & delivery logs
- Rate limiting per user

**Database:**
- `notifications` (id, user_id, type, channel, status, sent_at, delivered_at, error, retry_count)
- `notification_templates` (id, type, channel, subject, body, variables)

---

### 10. Incident Management

**Purpose:** Track and resolve system issues

**Components:**
- Locker failures
- Payment vs access mismatch
- Damage / missing tools

**Features:**
- Severity levels (critical, high, medium, low)
- Linked booking + locker
- Resolution notes
- Never deleted (soft delete only)

**Database:**
- `incidents` (id, type, severity, booking_id, locker_id, compartment_id, description, status, resolved_at, resolved_by, resolution_notes, created_at, updated_at)

**Types:**
- `locker_failure` - Hardware malfunction
- `payment_mismatch` - Payment succeeded but access denied
- `damage` - Tool damage reported
- `missing_tool` - Tool not returned
- `access_failure` - Cannot open compartment
- `other` - Miscellaneous

---

### 11. RBAC (Roles & Permissions)

**Purpose:** Access control

**Roles:**
- `admin` - Full system access
- `operator` - Booking management, locker control
- `technician` - Locker maintenance, incident resolution
- `customer` - Self-service only

**Rules:**
- Least privilege
- All role changes logged
- UI hides unauthorized actions

**Database:**
- `users` (id, email, name, phone, role, created_at, updated_at)
- `permissions` (id, resource, action, role)
- `role_changes` (id, user_id, old_role, new_role, changed_by, changed_at, reason)

---

### 12. SEO & Conversion Layer

**Purpose:** Marketing and discovery

**Components:**
- Programmatic pages (tool + location + use case)
- Schema.org markup (Product, LocalBusiness, FAQ)
- Rent vs Buy calculator
- Local trust signals

**Implementation:**
- Next.js dynamic routes: `/tools/[slug]`, `/tools/[slug]/[location]`
- Server-side rendering with metadata
- JSON-LD structured data
- Sitemap generation

---

## Database Schema (PostgreSQL)

### Core Tables

```sql
-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES product_categories(id),
  images JSONB DEFAULT '[]',
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);

-- Product Pricing
CREATE TABLE product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  duration_type VARCHAR(20) NOT NULL, -- 'hour', 'day', 'week'
  price DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_pricing_product ON product_pricing(product_id);

-- Lockers & Compartments
CREATE TABLE lockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location_address TEXT NOT NULL,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  mqtt_topic VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locker_id UUID NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  size VARCHAR(50), -- 'small', 'medium', 'large', 'xlarge'
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  pin_code_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(locker_id, number)
);

CREATE INDEX idx_compartments_locker ON compartments(locker_id);
CREATE INDEX idx_compartments_status ON compartments(status);

-- Product Locations (which products are in which compartments)
CREATE TABLE product_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, compartment_id)
);

CREATE INDEX idx_product_locations_product ON product_locations(product_id);
CREATE INDEX idx_product_locations_compartment ON product_locations(compartment_id);

-- Bookings (CORE TABLE)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  compartment_id UUID NOT NULL REFERENCES compartments(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_product ON bookings(product_id);
CREATE INDEX idx_bookings_compartment ON bookings(compartment_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings USING GIST (tsrange(start_at, end_at));

-- CRITICAL: Prevent overlapping bookings per compartment
CREATE UNIQUE INDEX idx_bookings_no_overlap ON bookings (compartment_id, id)
WHERE status IN ('paid', 'active')
WITH (fillfactor = 90);

-- Function to check overlaps
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE compartment_id = NEW.compartment_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status IN ('paid', 'active')
      AND tsrange(start_at, end_at) && tsrange(NEW.start_at, NEW.end_at)
  ) THEN
    RAISE EXCEPTION 'Booking overlaps with existing active booking for this compartment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_booking_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_overlap();

-- Booking Payments
CREATE TABLE booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'refunded'
  payment_intent_id VARCHAR(255),
  payment_method VARCHAR(50),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_payments_booking ON booking_payments(booking_id);
CREATE INDEX idx_booking_payments_status ON booking_payments(status);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  terms_version INTEGER NOT NULL,
  signature_type VARCHAR(50) NOT NULL, -- 'typed', 'smart_id', 'mobiil_id', 'id_card'
  signature_data JSONB,
  contract_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  signed_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)
);

CREATE INDEX idx_contracts_booking ON contracts(booking_id);
CREATE INDEX idx_contracts_hash ON contracts(contract_hash);

-- Access Events (Audit Trail)
CREATE TABLE access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  compartment_id UUID NOT NULL REFERENCES compartments(id),
  action VARCHAR(50) NOT NULL, -- 'open', 'close', 'attempt'
  result VARCHAR(50) NOT NULL, -- 'success', 'failure', 'timeout'
  method VARCHAR(50), -- 'mqtt', 'http', 'pin', 'sms'
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_access_events_booking ON access_events(booking_id);
CREATE INDEX idx_access_events_compartment ON access_events(compartment_id);
CREATE INDEX idx_access_events_timestamp ON access_events(timestamp DESC);

-- Returns
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  returned_at TIMESTAMPTZ NOT NULL,
  confirmed_by_user_at TIMESTAMPTZ,
  confirmed_by_admin_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'completed', 'disputed', 'resolved'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)
);

CREATE INDEX idx_returns_booking ON returns(booking_id);
CREATE INDEX idx_returns_status ON returns(status);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  subject VARCHAR(255),
  body TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  booking_id UUID REFERENCES bookings(id),
  locker_id UUID REFERENCES lockers(id),
  compartment_id UUID REFERENCES compartments(id),
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_booking ON incidents(booking_id);

-- Maintenance Blocks
CREATE TABLE maintenance_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

CREATE INDEX idx_maintenance_blocks_compartment ON maintenance_blocks(compartment_id);
CREATE INDEX idx_maintenance_blocks_dates ON maintenance_blocks USING GIST (tsrange(start_at, end_at));

-- Audit Log (System-wide)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

---

## API Contracts

### Booking API

#### POST /api/bookings
Create a new booking (pending status)

**Request:**
```json
{
  "product_id": "uuid",
  "compartment_id": "uuid",
  "start_at": "2024-01-15T10:00:00Z",
  "end_at": "2024-01-15T18:00:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "product_id": "uuid",
  "compartment_id": "uuid",
  "start_at": "2024-01-15T10:00:00Z",
  "end_at": "2024-01-15T18:00:00Z",
  "status": "pending",
  "total_price": 50.00,
  "deposit_amount": 100.00,
  "currency": "EUR",
  "expires_at": "2024-01-15T10:15:00Z"
}
```

#### POST /api/bookings/:id/pay
Process payment for booking

**Request:**
```json
{
  "payment_intent_id": "stripe_pi_xxx",
  "payment_method": "card"
}
```

#### POST /api/bookings/:id/extend
Extend booking duration

**Request:**
```json
{
  "new_end_at": "2024-01-15T20:00:00Z"
}
```

#### GET /api/bookings/:id/availability
Check if compartment is available for time range

**Query:**
- `start_at`: ISO timestamp
- `end_at`: ISO timestamp

**Response:**
```json
{
  "available": true,
  "conflicts": []
}
```

### Locker Access API

#### POST /api/lockers/:locker_id/compartments/:compartment_id/open
Open compartment

**Response:**
```json
{
  "success": true,
  "method": "mqtt",
  "event_id": "uuid",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Calendar API

#### GET /api/calendar/availability
Get availability slots

**Query:**
- `compartment_id`: UUID
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD

**Response:**
```json
{
  "slots": [
    {
      "start_at": "2024-01-15T10:00:00Z",
      "end_at": "2024-01-15T18:00:00Z",
      "available": true
    }
  ]
}
```

---

## State Transitions

### Booking Status Flow

```
pending (15min TTL)
  ↓ [payment succeeds]
paid
  ↓ [start_at reached]
active
  ↓ [end_at reached OR user confirms return]
completed

pending → cancelled (user cancels OR TTL expires)
paid → cancelled (before start_at)
active → overdue (end_at passed, no return)
overdue → completed (return confirmed)
```

### Return Status Flow

```
pending (user initiated)
  ↓ [admin verifies]
verified
  ↓ [finalized]
completed

pending → disputed (user disputes)
disputed → resolved (admin resolves)
```

---

## Guardrails & Edge Cases

### Double Booking Prevention
1. **Database constraint** - Unique index on (compartment_id, tsrange) for active bookings
2. **Application lock** - Redis distributed lock during booking creation
3. **Idempotency** - Booking creation endpoint accepts idempotency key

### Time Zone Handling
- All times stored as `TIMESTAMPTZ` in UTC
- Display converted to `Europe/Tallinn` on frontend
- DST handled automatically by PostgreSQL

### Payment vs Access Mismatch
- If payment succeeds but access fails → Create incident
- If access succeeds but payment fails → Revoke access, create incident
- All mismatches logged in `incidents` table

### Hardware Failures
- Retry logic: 3 attempts with exponential backoff
- Fallback: PIN code sent via SMS
- Booking status unaffected by hardware failures
- All failures logged in `access_events`

### Overdue Detection
- Cron job runs every 5 minutes
- Checks `bookings` where `status = 'active'` AND `end_at < NOW()`
- Updates status to `overdue`
- Calculates fees based on hourly rate
- Sends notifications

### Pending Booking TTL
- Redis TTL: 15 minutes
- Database cleanup job: Removes pending bookings older than 15 minutes
- User sees countdown timer

---

## Example JSON Payloads

### Booking Creation
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "compartment_id": "660e8400-e29b-41d4-a716-446655440001",
  "start_at": "2024-01-15T10:00:00+02:00",
  "end_at": "2024-01-15T18:00:00+02:00"
}
```

### Contract Signature
```json
{
  "booking_id": "770e8400-e29b-41d4-a716-446655440002",
  "signature_type": "smart_id",
  "signature_data": {
    "document_number": "PNOEE-12345678901",
    "certificate_level": "QUALIFIED",
    "signed_at": "2024-01-15T09:45:00Z"
  }
}
```

### Access Event
```json
{
  "booking_id": "770e8400-e29b-41d4-a716-446655440002",
  "compartment_id": "660e8400-e29b-41d4-a716-446655440001",
  "action": "open",
  "result": "success",
  "method": "mqtt",
  "timestamp": "2024-01-15T10:00:15Z",
  "metadata": {
    "locker_response_time_ms": 234,
    "retry_count": 0
  }
}
```

---

## Deployment Checklist

- [ ] PostgreSQL database with proper indexes
- [ ] Redis instance for locks/caching
- [ ] Environment variables configured
- [ ] MQTT broker accessible
- [ ] SMS/Email providers configured
- [ ] Payment provider (Stripe) configured
- [ ] Smart-ID/Mobiil-ID integration
- [ ] Monitoring & alerting setup
- [ ] Backup strategy
- [ ] Cron jobs configured (overdue detection, cleanup)

---

## Security Considerations

1. **SQL Injection** - Prisma ORM prevents SQL injection
2. **XSS** - React escapes by default, sanitize user input
3. **CSRF** - NextAuth.js handles CSRF tokens
4. **Rate Limiting** - Implement on all public endpoints
5. **Authentication** - JWT tokens, refresh tokens
6. **Authorization** - RBAC enforced at API level
7. **Audit Trail** - All critical actions logged
8. **Data Encryption** - TLS in transit, encryption at rest

---

**End of Architecture Document**
