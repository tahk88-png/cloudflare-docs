# Rentbox v2 Architecture Specification

**Status**: Draft
**Date**: 2025-12-26
**System**: Rentbox v2 (Production-Grade Rental Platform)

---

## 1. System Overview & Core Principles

Rentbox v2 is a self-service tool rental platform designed for 24/7 autonomous operation. The system acts as the single source of truth, enforcing strict time-based availability and physical access controls.

### Core Principles
1.  **Time-Based Availability**: Inventory is managed by time slots, not just quantity.
2.  **Server Authority**: The backend database is the only source of truth.
3.  **No Overlaps**: Strict database constraints prevent double bookings.
4.  **Auditability**: Every physical access and state change is logged.
5.  **Unattended Operation**: System handles lifecycle (booking → active → return → overdue) without human intervention.

### Technology Stack
*   **Frontend**: Next.js (App Router), Tailwind CSS, shadcn/ui.
*   **Backend**: NestJS (Node.js).
*   **Database**: PostgreSQL (Primary data, `timestamptz` usage).
*   **Cache/Queue**: Redis (Locking, session handling, background jobs).
*   **Infrastructure**: Vercel (Frontend), Cloudflare (Edge/DNS), Object Storage (R2/S3).
*   **Hardware Integration**: MQTT/HTTP Bridge service for locker control.

---

## 2. Database Schema (PostgreSQL)

All timestamps are stored as `timestamptz`.

### Core Tables

#### `users`
*   `id`: UUID (PK)
*   `email`: VARCHAR (Unique)
*   `phone`: VARCHAR
*   `role`: ENUM ('customer', 'technician', 'operator', 'admin')
*   `auth_provider`: VARCHAR
*   `kyc_status`: ENUM ('pending', 'verified', 'rejected')
*   `created_at`: TIMESTAMPTZ

#### `products`
*   `id`: UUID (PK)
*   `slug`: VARCHAR (Unique)
*   `name`: VARCHAR
*   `description`: TEXT
*   `hourly_price_cents`: INTEGER
*   `daily_price_cents`: INTEGER
*   `deposit_cents`: INTEGER
*   `content_json`: JSONB (Rich text content)
*   `is_active`: BOOLEAN

#### `lockers`
*   `id`: UUID (PK)
*   `location_name`: VARCHAR
*   `address`: TEXT
*   `hardware_id`: VARCHAR (Unique identifier for controller)
*   `is_online`: BOOLEAN

#### `compartments`
*   `id`: UUID (PK)
*   `locker_id`: UUID (FK -> lockers.id)
*   `door_index`: INTEGER
*   `size_code`: VARCHAR (S, M, L, XL)
*   `status`: ENUM ('available', 'maintenance', 'broken')

#### `inventory_items` (Physical instances of products)
*   `id`: UUID (PK)
*   `product_id`: UUID (FK -> products.id)
*   `compartment_id`: UUID (FK -> compartments.id, Nullable if in transit/maintenance)
*   `serial_number`: VARCHAR
*   `status`: ENUM ('ready', 'rented', 'maintenance', 'missing')

#### `bookings`
*   `id`: UUID (PK)
*   `user_id`: UUID (FK -> users.id)
*   `inventory_item_id`: UUID (FK -> inventory_items.id)
*   `compartment_id`: UUID (FK -> compartments.id) - *Snapshot of location at booking time*
*   `start_at`: TIMESTAMPTZ (TSTZRANGE start)
*   `end_at`: TIMESTAMPTZ (TSTZRANGE end)
*   `status`: ENUM ('pending', 'paid', 'active', 'completed', 'overdue', 'cancelled')
*   `access_code`: VARCHAR (Hashed)
*   `contract_hash`: VARCHAR (Immutable signature hash)
*   `total_amount_cents`: INTEGER
*   `deposit_held_cents`: INTEGER

### Critical Constraints (SQL)

```sql
-- Prevent overlapping bookings for the same item
CREATE EXTENSION btree_gist;
ALTER TABLE bookings
ADD CONSTRAINT no_overlap
EXCLUDE USING GIST (
  inventory_item_id WITH =,
  tstzrange(start_at, end_at) WITH &&
) WHERE (status IN ('paid', 'active', 'overdue'));
```

---

## 3. Module Architecture

### 1) Content Creation Engine
*   **Stack**: Tiptap (Headless editor) + OpenAI API.
*   **Workflow**:
    *   Admin drafts content (blocks: text, image, video).
    *   "AI Improve" button sends text to backend → LLM (Prompt: "Fix grammar, make concise, maintain tone").
    *   Output replaces block content on approval.
    *   Images optimized and uploaded to Object Storage.

### 2) Product & Catalog
*   **Logic**:
    *   Products have base metadata.
    *   Availability is aggregated from `inventory_items` schedules.
    *   Search: ElasticSearch or Postgres Full Text Search.
*   **Pricing**: Calculated dynamically based on duration (Hour vs Day rate).

### 3) Booking Engine (The Heart)
*   **Flow**:
    1.  **Selection**: User picks Time Range + Product.
    2.  **Availability Check**: Query `inventory_items` not booked in `[start, end]`.
    3.  **Lock**: Redis `SETNX lock:item:{id} 1 EX 600` (10 min hold).
    4.  **Create Pending Booking**: Status `pending`, payment timer starts.
    5.  **Payment/Sign**: If success → Status `paid`. If timeout → Status `expired`, Release Lock.
*   **Extension**: Users can extend `end_at` if no conflicting future booking exists.

### 4) Calendar System
*   **User View**:
    *   "Available Slots" computed by subtracting `bookings` ranges from `now() -> future`.
    *   Logic: `(Total Inventory) - (Active Bookings) > 0` for given time slice.
*   **Admin View**:
    *   Gantt chart: Y-axis = Compartments, X-axis = Time.
    *   Click-to-block (creates "Maintenance" booking).

### 5) User Dashboard
*   **Live State**: Websocket/Polling for `active` bookings.
*   **Actions**: "Unlock Door" (only if `now()` in `[start_at, end_at]`), "Extend", "Return".

### 6) Checkout & Signing
*   **Process**:
    *   Generate PDF contract with details.
    *   Calculate SHA-256 hash of contract.
    *   **Auth**: Require Strong Auth (Smart-ID/Mobile-ID) via OIDC/API if `amount > threshold`.
    *   **Signature**: Store digital signature metadata with booking.
    *   **Payment**: Stripe/local provider Intent captured only after signature validity.

### 7) Locker Access Service
*   **Hardware Abstraction Layer (HAL)**:
    *   Interface: `openCompartment(lockerId, doorIndex)`.
    *   Implementation: MQTT command to broker → IoT Controller on site.
*   **Security**:
    *   Server validates: `booking.user_id == current_user` AND `now() BETWEEN start_at AND end_at`.
    *   Rate limiting: Prevent spam clicking.
*   **Telemetry**: Log `door_open`, `door_close`, `heartbeat` events from hardware.

### 8) Return Flow
*   **Steps**:
    1.  User clicks "Return" in app.
    2.  App asks: "Is the tool clean and undamaged?"
    3.  User uploads photo (optional but encouraged).
    4.  App unlocks door.
    5.  User places item, closes door.
    6.  Hardware detects `door_closed`.
    7.  Booking status → `completed`.
    8.  Deposit release triggered (async).

### 9) Notification Engine
*   **Queue**: BullMQ (Redis).
*   **Triggers**:
    *   `BOOKING_CREATED` → Email invoice.
    *   `15_MIN_BEFORE_START` → SMS "Your code is 1234".
    *   `15_MIN_BEFORE_END` → SMS "Return time approaching".
    *   `OVERDUE` → SMS/Email "You are overdue. Fees apply."

### 10) Incident Management
*   **Ticket System**: Internal admin tool.
*   **Auto-Creation**:
    *   Hardware offline > 5 mins.
    *   User reports "Door didn't open".
    *   Overdue > 24 hours.

### 11) RBAC
*   **Guards**: NestJS Guards + Decorators `@Roles('admin')`.
*   **Audit**: Middleware logs `User X performed Action Y on Resource Z` to `audit_logs` table.

### 12) SEO & Conversion
*   **SSG/ISR**: Product pages rendered at build time/on-demand revalidate.
*   **Schema**: JSON-LD injected for `Product` and `Offer`.

---

## 4. API Contracts (Key Examples)

### POST `/api/v1/bookings`
**Request**:
```json
{
  "product_id": "uuid",
  "start_at": "2023-10-27T10:00:00Z",
  "end_at": "2023-10-27T14:00:00Z"
}
```
**Response**:
```json
{
  "booking_id": "uuid",
  "status": "pending",
  "expires_at": "2023-10-27T09:55:00Z", // Payment deadline
  "total_price": 1500,
  "currency": "EUR"
}
```

### POST `/api/v1/lockers/{id}/open`
**Request**:
```json
{
  "booking_id": "uuid",
  "lat": 59.437, // Geo-fencing check (optional)
  "lng": 24.753
}
```
**Response**:
```json
{
  "success": true,
  "message": "Door opening...",
  "trace_id": "abc-123"
}
```

---

## 5. State Transitions (Booking)

```mermaid
graph TD
    Start -->|User Selects Slot| Pending
    Pending -->|Timeout (10m)| Expired
    Pending -->|Payment + Sign| Paid
    Paid -->|Start Time Arrives| Active
    Active -->|User Opens Locker| Active
    Active -->|End Time Passed| Overdue
    Overdue -->|Return| CompletedWithLateFee
    Active -->|Return| Completed
    Paid -->|Cancel (<24h)| Cancelled
```

---

## 6. Guardrails & Reliability

### Reliability
*   **Idempotency**: All payment and hardware control endpoints use `Idempotency-Key` header.
*   **Offline Mode**: if Internet fails, users have emergency SMS PIN (pre-cached on hardware or fallback GSM module).

### Error Handling
*   **User Visible**: "We couldn't open the locker. Trying again... (Attempt 2/3)" → "Please call support."
*   **Internal**: Stack trace + Context logged to Sentry/Datadog.

### Data Integrity
*   **DB Constraints**: `EXCLUDE` constraints for time overlaps.
*   **Transactions**: Payment capture and Status update happen in one DB transaction.

---

## 7. Example JSON Payload (Product)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Heavy Duty Drill",
  "slug": "heavy-duty-drill-makita-x1",
  "pricing": {
    "hourly": 500,
    "daily": 2500,
    "currency": "EUR"
  },
  "availability": {
    "next_available_slot": "2023-10-27T15:00:00Z",
    "status": "available"
  },
  "media": [
    { "type": "image", "url": "https://cdn.rentbox.ee/drill-1.jpg" }
  ],
  "specs": {
    "power": "18V",
    "weight": "2.1kg"
  }
}
```
