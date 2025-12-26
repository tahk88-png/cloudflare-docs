# Rentbox v2 - Database Schema

> PostgreSQL 15+ with strict constraints, timestamptz everywhere, and full audit logging.

## Design Principles

1. **All timestamps use `timestamptz`** - Never use `timestamp` without timezone
2. **Render times in Europe/Tallinn** - Application layer handles display conversion
3. **No overlapping bookings** - Enforced by PostgreSQL exclusion constraints
4. **Soft deletes with `deleted_at`** - Nothing is ever truly deleted
5. **Audit trails on all critical tables** - `created_at`, `updated_at`, `created_by`, `updated_by`
6. **UUIDs for public-facing IDs** - Sequential IDs for internal references

---

## Core Tables

### 1. Users & Authentication

```sql
-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(100) UNIQUE,  -- From auth provider (Clerk, Auth0)
    
    -- Profile
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    personal_code   VARCHAR(20),          -- Estonian isikukood (encrypted)
    company_name    VARCHAR(255),
    company_reg_nr  VARCHAR(20),
    
    -- Type
    user_type       VARCHAR(20) NOT NULL DEFAULT 'individual'
                    CHECK (user_type IN ('individual', 'business', 'operator')),
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'pending_verification')),
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Settings
    locale          VARCHAR(10) DEFAULT 'et-EE',
    timezone        VARCHAR(50) DEFAULT 'Europe/Tallinn',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true}'::jsonb,
    
    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- ============================================================================
-- USER ADDRESSES
-- ============================================================================
CREATE TABLE user_addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    label           VARCHAR(50) NOT NULL DEFAULT 'home',
    street          VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(20) NOT NULL,
    country         VARCHAR(2) NOT NULL DEFAULT 'EE',
    
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
```

### 2. Roles & Permissions (RBAC)

```sql
-- ============================================================================
-- ROLES
-- ============================================================================
CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,  -- Cannot be deleted
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default roles
INSERT INTO roles (name, description, is_system) VALUES
    ('admin', 'Full system access', TRUE),
    ('operator', 'Manage bookings and lockers', TRUE),
    ('technician', 'Locker maintenance only', TRUE),
    ('customer', 'Standard customer access', TRUE);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
CREATE TABLE permissions (
    id              SERIAL PRIMARY KEY,
    resource        VARCHAR(50) NOT NULL,   -- e.g., 'booking', 'locker', 'user'
    action          VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete'
    description     TEXT,
    
    UNIQUE(resource, action)
);

-- ============================================================================
-- ROLE PERMISSIONS
-- ============================================================================
CREATE TABLE role_permissions (
    role_id         INTEGER NOT NULL REFERENCES roles(id),
    permission_id   INTEGER NOT NULL REFERENCES permissions(id),
    
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- USER ROLES
-- ============================================================================
CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    role_id         INTEGER NOT NULL REFERENCES roles(id),
    
    -- Scope (optional - for location-specific roles)
    location_id     UUID REFERENCES locations(id),
    
    granted_by      UUID REFERENCES users(id),
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID REFERENCES users(id),
    
    UNIQUE(user_id, role_id, location_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE revoked_at IS NULL;

-- ============================================================================
-- ROLE CHANGE AUDIT LOG
-- ============================================================================
CREATE TABLE role_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id),
    role_id         INTEGER NOT NULL REFERENCES roles(id),
    action          VARCHAR(20) NOT NULL CHECK (action IN ('granted', 'revoked', 'expired')),
    performed_by    UUID REFERENCES users(id),
    reason          TEXT,
    ip_address      INET,
    user_agent      TEXT,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_role_audit_user ON role_audit_log(user_id);
CREATE INDEX idx_role_audit_created ON role_audit_log(created_at);
```

### 3. Locations & Lockers

```sql
-- ============================================================================
-- LOCATIONS (Physical sites with lockers)
-- ============================================================================
CREATE TABLE locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    code            VARCHAR(20) NOT NULL UNIQUE,  -- e.g., 'TLN-001'
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    
    -- Address
    street          VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(20) NOT NULL,
    country         VARCHAR(2) NOT NULL DEFAULT 'EE',
    coordinates     POINT,
    
    -- Operations
    timezone        VARCHAR(50) NOT NULL DEFAULT 'Europe/Tallinn',
    operating_hours JSONB NOT NULL DEFAULT '{
        "monday": {"open": "00:00", "close": "23:59"},
        "tuesday": {"open": "00:00", "close": "23:59"},
        "wednesday": {"open": "00:00", "close": "23:59"},
        "thursday": {"open": "00:00", "close": "23:59"},
        "friday": {"open": "00:00", "close": "23:59"},
        "saturday": {"open": "00:00", "close": "23:59"},
        "sunday": {"open": "00:00", "close": "23:59"}
    }'::jsonb,
    is_24h          BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'maintenance', 'inactive')),
    
    -- Contact
    contact_phone   VARCHAR(20),
    contact_email   VARCHAR(255),
    
    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_locations_status ON locations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_city ON locations(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_coordinates ON locations USING GIST (coordinates) WHERE deleted_at IS NULL;

-- ============================================================================
-- LOCKERS (Physical locker units)
-- ============================================================================
CREATE TABLE lockers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES locations(id),
    
    -- Identity
    code            VARCHAR(20) NOT NULL,         -- e.g., 'L001'
    serial_number   VARCHAR(100) UNIQUE,
    
    -- Hardware
    hardware_type   VARCHAR(50) NOT NULL,         -- e.g., 'smartbox_v2'
    firmware_version VARCHAR(20),
    last_heartbeat  TIMESTAMPTZ,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'online'
                    CHECK (status IN ('online', 'offline', 'maintenance', 'error')),
    
    -- Configuration
    config          JSONB DEFAULT '{}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(location_id, code)
);

CREATE INDEX idx_lockers_location ON lockers(location_id);
CREATE INDEX idx_lockers_status ON lockers(status);

-- ============================================================================
-- COMPARTMENTS (Individual compartments within lockers)
-- ============================================================================
CREATE TABLE compartments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locker_id       UUID NOT NULL REFERENCES lockers(id),
    
    -- Identity
    number          INTEGER NOT NULL,             -- Door number (1, 2, 3...)
    code            VARCHAR(20) NOT NULL,         -- Display code 'A1', 'B2'
    
    -- Physical
    size            VARCHAR(20) NOT NULL          -- small, medium, large, xlarge
                    CHECK (size IN ('small', 'medium', 'large', 'xlarge')),
    dimensions      JSONB,                        -- {"width": 30, "height": 40, "depth": 50}
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance', 'blocked')),
    
    -- Current state
    is_door_open    BOOLEAN NOT NULL DEFAULT FALSE,
    last_opened_at  TIMESTAMPTZ,
    last_closed_at  TIMESTAMPTZ,
    
    -- Assigned tool (if dedicated)
    assigned_product_id UUID REFERENCES products(id),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(locker_id, number)
);

CREATE INDEX idx_compartments_locker ON compartments(locker_id);
CREATE INDEX idx_compartments_status ON compartments(status);
CREATE INDEX idx_compartments_size ON compartments(size);
```

### 4. Products & Catalog

```sql
-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID REFERENCES categories(id),
    
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    
    -- SEO
    meta_title      VARCHAR(200),
    meta_description VARCHAR(500),
    
    -- Display
    icon            VARCHAR(50),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================================================
-- PRODUCTS (Tool definitions)
-- ============================================================================
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID NOT NULL REFERENCES categories(id),
    
    -- Identity
    sku             VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    
    -- Description
    short_description VARCHAR(500),
    description     TEXT,
    specifications  JSONB DEFAULT '{}'::jsonb,    -- Technical specs
    
    -- Media
    images          JSONB DEFAULT '[]'::jsonb,    -- Array of image URLs
    videos          JSONB DEFAULT '[]'::jsonb,
    documents       JSONB DEFAULT '[]'::jsonb,    -- Manuals, safety info
    
    -- Pricing
    hourly_rate     DECIMAL(10,2) NOT NULL,
    daily_rate      DECIMAL(10,2) NOT NULL,
    weekly_rate     DECIMAL(10,2),
    deposit_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Rental rules
    min_rental_hours INTEGER NOT NULL DEFAULT 1,
    max_rental_days  INTEGER NOT NULL DEFAULT 30,
    buffer_minutes   INTEGER NOT NULL DEFAULT 30,  -- Time between rentals
    
    -- Requirements
    requires_deposit BOOLEAN NOT NULL DEFAULT TRUE,
    requires_id_verification BOOLEAN NOT NULL DEFAULT FALSE,
    min_age         INTEGER DEFAULT 18,
    requires_training BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Physical
    weight_kg       DECIMAL(6,2),
    compartment_size VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (compartment_size IN ('small', 'medium', 'large', 'xlarge')),
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'discontinued')),
    
    -- SEO
    meta_title      VARCHAR(200),
    meta_description VARCHAR(500),
    
    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug ON products(slug) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_products_search ON products 
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(short_description, '')));

-- ============================================================================
-- PRODUCT INVENTORY (Physical tools at locations)
-- ============================================================================
CREATE TABLE product_inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id),
    location_id     UUID NOT NULL REFERENCES locations(id),
    
    -- Identity
    serial_number   VARCHAR(100),
    asset_tag       VARCHAR(50),
    
    -- Status
    condition       VARCHAR(20) NOT NULL DEFAULT 'good'
                    CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'rented', 'maintenance', 'retired')),
    
    -- Assignment
    compartment_id  UUID REFERENCES compartments(id),
    
    -- Maintenance
    last_inspection TIMESTAMPTZ,
    next_inspection TIMESTAMPTZ,
    maintenance_notes TEXT,
    
    -- Stats
    total_rentals   INTEGER NOT NULL DEFAULT 0,
    total_revenue   DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON product_inventory(product_id);
CREATE INDEX idx_inventory_location ON product_inventory(location_id);
CREATE INDEX idx_inventory_status ON product_inventory(status);
CREATE INDEX idx_inventory_compartment ON product_inventory(compartment_id);
```

### 5. Bookings (CRITICAL)

```sql
-- ============================================================================
-- BOOKINGS - THE CORE TABLE
-- ============================================================================
-- This table enforces the fundamental constraint: NO OVERLAPPING BOOKINGS
-- ============================================================================

CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    booking_number  VARCHAR(20) NOT NULL UNIQUE,  -- Human-readable: RB-2024-0001
    
    -- Parties
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- What & Where
    product_id      UUID NOT NULL REFERENCES products(id),
    inventory_id    UUID NOT NULL REFERENCES product_inventory(id),
    location_id     UUID NOT NULL REFERENCES locations(id),
    compartment_id  UUID NOT NULL REFERENCES compartments(id),
    
    -- CRITICAL: Time window (timestamptz!)
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    
    -- Actual times (filled when events occur)
    picked_up_at    TIMESTAMPTZ,
    returned_at     TIMESTAMPTZ,
    
    -- Status (see state machine documentation)
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                        'pending',      -- Awaiting payment
                        'confirmed',    -- Paid, not yet started
                        'active',       -- Currently rented
                        'completed',    -- Successfully returned
                        'overdue',      -- Past end_at, not returned
                        'cancelled',    -- Cancelled by user/system
                        'expired'       -- Pending booking timed out
                    )),
    
    -- Pricing
    hourly_rate     DECIMAL(10,2) NOT NULL,
    daily_rate      DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    deposit_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Additional charges
    extension_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    overdue_charges   DECIMAL(10,2) NOT NULL DEFAULT 0,
    damage_charges    DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Payment tracking
    deposit_status  VARCHAR(20) DEFAULT 'pending'
                    CHECK (deposit_status IN ('pending', 'held', 'released', 'captured', 'refunded')),
    payment_status  VARCHAR(20) DEFAULT 'pending'
                    CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
    
    -- Contract
    contract_signed_at TIMESTAMPTZ,
    contract_hash   VARCHAR(64),          -- SHA-256 of signed contract
    signature_type  VARCHAR(20)           -- 'typed', 'smart_id', 'mobile_id', 'id_card'
                    CHECK (signature_type IN ('typed', 'smart_id', 'mobile_id', 'id_card')),
    
    -- Source
    source          VARCHAR(20) NOT NULL DEFAULT 'web'
                    CHECK (source IN ('web', 'mobile', 'admin', 'api')),
    
    -- Metadata
    notes           TEXT,
    admin_notes     TEXT,                 -- Internal notes (never shown to customer)
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    -- TTL for pending bookings (Redis handles expiration, DB tracks deadline)
    expires_at      TIMESTAMPTZ,
    
    -- Idempotency
    idempotency_key VARCHAR(100),
    
    -- Audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_time_window CHECK (end_at > start_at),
    CONSTRAINT valid_duration CHECK (end_at - start_at <= INTERVAL '30 days'),
    CONSTRAINT expires_only_pending CHECK (
        (status = 'pending' AND expires_at IS NOT NULL) OR
        (status != 'pending' AND expires_at IS NULL)
    )
);

-- ============================================================================
-- CRITICAL: EXCLUSION CONSTRAINT - NO OVERLAPPING BOOKINGS
-- ============================================================================
-- This constraint ensures that for any given compartment, no two bookings
-- can have overlapping time windows. This is THE fundamental guarantee.
-- ============================================================================

-- Requires btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING GIST (
        compartment_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'expired'));

-- ============================================================================
-- INDEXES FOR BOOKING QUERIES
-- ============================================================================

-- Primary lookups
CREATE INDEX idx_bookings_user ON bookings(user_id) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_compartment ON bookings(compartment_id) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_inventory ON bookings(inventory_id) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_location ON bookings(location_id) WHERE status NOT IN ('cancelled', 'expired');

-- Time-based queries
CREATE INDEX idx_bookings_start ON bookings(start_at) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_end ON bookings(end_at) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_time_range ON bookings USING GIST (tstzrange(start_at, end_at));

-- Status lookups
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pending_expiry ON bookings(expires_at) WHERE status = 'pending';
CREATE INDEX idx_bookings_overdue ON bookings(end_at) WHERE status = 'active';

-- Reference lookups
CREATE INDEX idx_bookings_number ON bookings(booking_number);
CREATE INDEX idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- BOOKING EXTENSIONS
-- ============================================================================
CREATE TABLE booking_extensions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    
    -- Time change
    original_end_at TIMESTAMPTZ NOT NULL,
    new_end_at      TIMESTAMPTZ NOT NULL,
    
    -- Pricing
    additional_amount DECIMAL(10,2) NOT NULL,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    
    -- Audit
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    processed_by    UUID REFERENCES users(id),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extensions_booking ON booking_extensions(booking_id);

-- ============================================================================
-- BOOKING STATUS HISTORY
-- ============================================================================
CREATE TABLE booking_status_history (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    
    from_status     VARCHAR(20),
    to_status       VARCHAR(20) NOT NULL,
    
    reason          TEXT,
    triggered_by    VARCHAR(20) NOT NULL  -- 'user', 'system', 'admin', 'payment'
                    CHECK (triggered_by IN ('user', 'system', 'admin', 'payment', 'locker')),
    user_id         UUID REFERENCES users(id),
    
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_history_booking ON booking_status_history(booking_id);
CREATE INDEX idx_booking_history_created ON booking_status_history(created_at);
```

### 6. Payments

```sql
-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    
    -- External reference
    external_id     VARCHAR(100),         -- Stripe payment_intent ID
    provider        VARCHAR(20) NOT NULL  -- 'stripe', 'everypay', etc.
                    CHECK (provider IN ('stripe', 'everypay', 'bank_transfer', 'cash')),
    
    -- Type
    type            VARCHAR(20) NOT NULL
                    CHECK (type IN ('rental', 'deposit', 'extension', 'overdue', 'damage')),
    
    -- Amount
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
    
    -- Timestamps
    authorized_at   TIMESTAMPTZ,
    captured_at     TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,
    refunded_at     TIMESTAMPTZ,
    
    -- Failure tracking
    failure_code    VARCHAR(50),
    failure_message TEXT,
    
    -- Metadata
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_external ON payments(external_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- REFUNDS
-- ============================================================================
CREATE TABLE refunds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID NOT NULL REFERENCES payments(id),
    
    external_id     VARCHAR(100),
    amount          DECIMAL(10,2) NOT NULL,
    reason          TEXT NOT NULL,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
    
    processed_at    TIMESTAMPTZ,
    processed_by    UUID REFERENCES users(id),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);

-- ============================================================================
-- INVOICES
-- ============================================================================
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    invoice_number  VARCHAR(30) NOT NULL UNIQUE,  -- INV-2024-000001
    
    -- Amounts
    subtotal        DECIMAL(10,2) NOT NULL,
    tax_amount      DECIMAL(10,2) NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'issued', 'paid', 'void', 'overdue')),
    
    -- Dates
    issued_at       TIMESTAMPTZ,
    due_at          TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    
    -- PDF
    pdf_url         TEXT,
    
    -- Line items stored as JSONB
    line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
```

### 7. Locker Events & Access

```sql
-- ============================================================================
-- LOCKER ACCESS TOKENS
-- ============================================================================
CREATE TABLE locker_access_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    compartment_id  UUID NOT NULL REFERENCES compartments(id),
    
    -- Token (encrypted PIN or access code)
    token_hash      VARCHAR(128) NOT NULL,
    token_type      VARCHAR(20) NOT NULL DEFAULT 'pin'
                    CHECK (token_type IN ('pin', 'qr', 'nfc', 'app')),
    
    -- Validity
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ NOT NULL,
    
    -- Usage
    max_uses        INTEGER NOT NULL DEFAULT 2,  -- Open for pickup + return
    use_count       INTEGER NOT NULL DEFAULT 0,
    last_used_at    TIMESTAMPTZ,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_tokens_booking ON locker_access_tokens(booking_id);
CREATE INDEX idx_access_tokens_compartment ON locker_access_tokens(compartment_id);
CREATE INDEX idx_access_tokens_valid ON locker_access_tokens(valid_from, valid_until) 
    WHERE status = 'active';

-- ============================================================================
-- LOCKER EVENTS (IMMUTABLE AUDIT LOG)
-- ============================================================================
CREATE TABLE locker_events (
    id              BIGSERIAL PRIMARY KEY,
    
    -- Context
    locker_id       UUID NOT NULL REFERENCES lockers(id),
    compartment_id  UUID REFERENCES compartments(id),
    booking_id      UUID REFERENCES bookings(id),
    user_id         UUID REFERENCES users(id),
    
    -- Event
    event_type      VARCHAR(50) NOT NULL,
    /*
        DOOR EVENTS:
        - door_open_requested
        - door_opened
        - door_open_failed
        - door_closed
        - door_timeout (left open too long)
        
        ACCESS EVENTS:
        - access_granted
        - access_denied
        - pin_entered
        - pin_failed
        
        SYSTEM EVENTS:
        - heartbeat
        - online
        - offline
        - error
        - maintenance_start
        - maintenance_end
    */
    
    -- Details
    success         BOOLEAN NOT NULL DEFAULT TRUE,
    error_code      VARCHAR(50),
    error_message   TEXT,
    
    -- Hardware state
    hardware_state  JSONB DEFAULT '{}'::jsonb,
    
    -- Source
    triggered_by    VARCHAR(20) NOT NULL
                    CHECK (triggered_by IN ('user', 'system', 'admin', 'hardware', 'scheduled')),
    
    -- Request tracking
    request_id      VARCHAR(100),
    
    -- Immutable timestamp
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month for performance
-- CREATE TABLE locker_events_2024_01 PARTITION OF locker_events
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE INDEX idx_locker_events_locker ON locker_events(locker_id);
CREATE INDEX idx_locker_events_compartment ON locker_events(compartment_id);
CREATE INDEX idx_locker_events_booking ON locker_events(booking_id);
CREATE INDEX idx_locker_events_created ON locker_events(created_at);
CREATE INDEX idx_locker_events_type ON locker_events(event_type);
```

### 8. Notifications

```sql
-- ============================================================================
-- NOTIFICATION TEMPLATES
-- ============================================================================
CREATE TABLE notification_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code            VARCHAR(50) NOT NULL UNIQUE,  -- 'booking_confirmed', 'return_reminder'
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    
    -- Channel support
    email_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Email template
    email_subject   TEXT,
    email_body_html TEXT,
    email_body_text TEXT,
    
    -- SMS template
    sms_body        TEXT,
    
    -- Variables available (documentation)
    variables       JSONB DEFAULT '[]'::jsonb,
    
    -- Timing
    send_delay_minutes INTEGER DEFAULT 0,
    
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS (SENT)
-- ============================================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- Context
    booking_id      UUID REFERENCES bookings(id),
    template_id     UUID REFERENCES notification_templates(id),
    
    -- Channel
    channel         VARCHAR(20) NOT NULL
                    CHECK (channel IN ('email', 'sms', 'push')),
    
    -- Destination
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    
    -- Content (rendered)
    subject         TEXT,
    body            TEXT NOT NULL,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced')),
    
    -- Delivery tracking
    external_id     VARCHAR(100),         -- Provider message ID
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,
    
    -- Error tracking
    error_code      VARCHAR(50),
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMPTZ,
    
    -- Metadata
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_retry ON notifications(next_retry_at) WHERE status = 'failed';
```

### 9. Incidents

```sql
-- ============================================================================
-- INCIDENTS
-- ============================================================================
CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    incident_number VARCHAR(20) NOT NULL UNIQUE,  -- INC-2024-0001
    
    -- Context
    booking_id      UUID REFERENCES bookings(id),
    locker_id       UUID REFERENCES lockers(id),
    compartment_id  UUID REFERENCES compartments(id),
    user_id         UUID REFERENCES users(id),
    
    -- Classification
    type            VARCHAR(50) NOT NULL,
    /*
        Types:
        - locker_malfunction
        - door_stuck
        - payment_mismatch
        - tool_damaged
        - tool_missing
        - unauthorized_access
        - customer_complaint
        - overdue_unresolved
    */
    
    severity        VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'investigating', 'pending_action', 'resolved', 'closed')),
    
    -- Description
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    
    -- Resolution
    resolution      TEXT,
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id),
    
    -- Assignment
    assigned_to     UUID REFERENCES users(id),
    
    -- Metadata
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_incidents_booking ON incidents(booking_id);
CREATE INDEX idx_incidents_locker ON incidents(locker_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to) WHERE status NOT IN ('resolved', 'closed');

-- ============================================================================
-- INCIDENT COMMENTS
-- ============================================================================
CREATE TABLE incident_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID NOT NULL REFERENCES incidents(id),
    
    user_id         UUID NOT NULL REFERENCES users(id),
    comment         TEXT NOT NULL,
    
    -- Attachments
    attachments     JSONB DEFAULT '[]'::jsonb,
    
    -- Visibility
    is_internal     BOOLEAN NOT NULL DEFAULT FALSE,  -- Hide from customer
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_comments_incident ON incident_comments(incident_id);

-- ============================================================================
-- INCIDENT ATTACHMENTS
-- ============================================================================
CREATE TABLE incident_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID NOT NULL REFERENCES incidents(id),
    
    filename        VARCHAR(255) NOT NULL,
    file_type       VARCHAR(50) NOT NULL,
    file_size       INTEGER NOT NULL,
    file_url        TEXT NOT NULL,
    
    uploaded_by     UUID REFERENCES users(id),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_attachments_incident ON incident_attachments(incident_id);
```

### 10. Content Management

```sql
-- ============================================================================
-- CONTENT BLOCKS (Block-based editor)
-- ============================================================================
CREATE TABLE content_pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    slug            VARCHAR(255) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    
    -- SEO
    meta_title      VARCHAR(200),
    meta_description VARCHAR(500),
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    
    published_at    TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_content_pages_slug ON content_pages(slug);
CREATE INDEX idx_content_pages_status ON content_pages(status);

-- ============================================================================
-- CONTENT BLOCKS
-- ============================================================================
CREATE TABLE content_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
    
    -- Block type
    type            VARCHAR(50) NOT NULL,
    /*
        Types:
        - text
        - heading
        - image
        - video
        - cta_button
        - product_card
        - faq
        - testimonial
    */
    
    -- Content
    content         JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Ordering
    sort_order      INTEGER NOT NULL DEFAULT 0,
    
    -- Visibility
    is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_blocks_page ON content_blocks(page_id);

-- ============================================================================
-- CONTENT VERSIONS (History)
-- ============================================================================
CREATE TABLE content_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES content_pages(id),
    
    version_number  INTEGER NOT NULL,
    
    -- Snapshot
    title           VARCHAR(255) NOT NULL,
    blocks          JSONB NOT NULL,       -- Full snapshot of all blocks
    
    -- Audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    UNIQUE(page_id, version_number)
);

CREATE INDEX idx_content_versions_page ON content_versions(page_id);
```

### 11. Contracts & Signatures

```sql
-- ============================================================================
-- CONTRACT TEMPLATES
-- ============================================================================
CREATE TABLE contract_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    
    -- Content
    content_html    TEXT NOT NULL,
    content_text    TEXT NOT NULL,
    
    -- Variables
    variables       JSONB DEFAULT '[]'::jsonb,
    
    -- Requirements
    requires_strong_auth BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Versioning
    version         INTEGER NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SIGNED CONTRACTS
-- ============================================================================
CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    template_id     UUID NOT NULL REFERENCES contract_templates(id),
    
    -- Rendered content
    content_html    TEXT NOT NULL,
    content_text    TEXT NOT NULL,
    
    -- Signature
    signature_type  VARCHAR(20) NOT NULL
                    CHECK (signature_type IN ('typed', 'smart_id', 'mobile_id', 'id_card')),
    signature_value TEXT,                 -- Typed name or cert reference
    signer_name     VARCHAR(255) NOT NULL,
    signer_personal_code VARCHAR(20),     -- Estonian isikukood
    
    -- Verification
    content_hash    VARCHAR(64) NOT NULL, -- SHA-256 of content at signing
    signature_hash  VARCHAR(64) NOT NULL, -- SHA-256 of signature data
    
    -- Timestamps
    signed_at       TIMESTAMPTZ NOT NULL,
    
    -- IP/Device
    ip_address      INET,
    user_agent      TEXT,
    
    -- PDF
    pdf_url         TEXT,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_booking ON contracts(booking_id);
CREATE INDEX idx_contracts_user ON contracts(user_id);
```

### 12. Audit & System

```sql
-- ============================================================================
-- GLOBAL AUDIT LOG
-- ============================================================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    
    -- Actor
    user_id         UUID REFERENCES users(id),
    
    -- Action
    action          VARCHAR(50) NOT NULL,   -- 'create', 'update', 'delete', 'login', etc.
    resource_type   VARCHAR(50) NOT NULL,   -- 'booking', 'user', 'locker', etc.
    resource_id     UUID,
    
    -- Changes
    old_values      JSONB,
    new_values      JSONB,
    
    -- Context
    ip_address      INET,
    user_agent      TEXT,
    request_id      VARCHAR(100),
    
    -- Timestamp
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================
CREATE TABLE system_config (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL,
    description     TEXT,
    
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID REFERENCES users(id)
);

-- ============================================================================
-- SCHEDULED JOBS
-- ============================================================================
CREATE TABLE scheduled_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    
    -- Schedule
    cron_expression VARCHAR(100) NOT NULL,
    timezone        VARCHAR(50) NOT NULL DEFAULT 'Europe/Tallinn',
    
    -- Status
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Last run
    last_run_at     TIMESTAMPTZ,
    last_run_status VARCHAR(20)
                    CHECK (last_run_status IN ('success', 'failed', 'running')),
    last_run_duration_ms INTEGER,
    last_error      TEXT,
    
    -- Next run
    next_run_at     TIMESTAMPTZ,
    
    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- JOB EXECUTION HISTORY
-- ============================================================================
CREATE TABLE job_executions (
    id              BIGSERIAL PRIMARY KEY,
    job_id          UUID NOT NULL REFERENCES scheduled_jobs(id),
    
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ,
    
    status          VARCHAR(20) NOT NULL
                    CHECK (status IN ('running', 'success', 'failed')),
    
    duration_ms     INTEGER,
    error           TEXT,
    
    -- Results
    records_processed INTEGER,
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_job_executions_job ON job_executions(job_id);
CREATE INDEX idx_job_executions_started ON job_executions(started_at);
```

---

## Functions & Triggers

### Automatic Timestamp Updates

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (apply to all relevant tables)
```

### Booking Number Generation

```sql
-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(booking_number FROM 9) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM bookings
    WHERE booking_number LIKE 'RB-' || year_part || '-%';
    
    NEW.booking_number := 'RB-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_number BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION generate_booking_number();
```

### Availability Check Function

```sql
-- Check if a compartment is available for a time window
CREATE OR REPLACE FUNCTION is_compartment_available(
    p_compartment_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE compartment_id = p_compartment_id
          AND status NOT IN ('cancelled', 'expired')
          AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
          AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    );
END;
$$ LANGUAGE plpgsql;
```

---

## Indexes Summary

All critical query paths are indexed:

| Query Pattern | Index |
|--------------|-------|
| Find bookings by user | `idx_bookings_user` |
| Find bookings by compartment | `idx_bookings_compartment` |
| Check availability (time range) | `idx_bookings_time_range` (GIST) |
| Find pending bookings to expire | `idx_bookings_pending_expiry` |
| Find active bookings past end time | `idx_bookings_overdue` |
| Product search | `idx_products_search` (GIN, full-text) |
| Location search by coordinates | `idx_locations_coordinates` (GIST) |

---

## Data Retention

| Table | Retention | Notes |
|-------|-----------|-------|
| `bookings` | Forever | Soft delete only |
| `locker_events` | 2 years | Partition monthly |
| `audit_log` | 7 years | Compliance requirement |
| `notifications` | 1 year | Archive to cold storage |
| `job_executions` | 90 days | Cleanup old records |

---

## Migration Strategy

1. All migrations are versioned and idempotent
2. Zero-downtime migrations using `pg_repack` for large tables
3. Feature flags for schema changes requiring code changes
4. Rollback scripts for every migration
