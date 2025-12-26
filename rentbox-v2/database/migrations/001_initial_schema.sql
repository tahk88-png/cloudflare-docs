-- ============================================================================
-- Rentbox v2 - Initial Database Schema Migration
-- Version: 001
-- Created: 2024
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(100) UNIQUE,
    
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    personal_code   VARCHAR(100),
    company_name    VARCHAR(255),
    company_reg_nr  VARCHAR(20),
    
    user_type       VARCHAR(20) NOT NULL DEFAULT 'individual'
                    CHECK (user_type IN ('individual', 'business', 'operator')),
    
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'pending_verification')),
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    
    locale          VARCHAR(10) DEFAULT 'et-EE',
    timezone        VARCHAR(50) DEFAULT 'Europe/Tallinn',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_external_id ON users(external_id) WHERE external_id IS NOT NULL;

-- ============================================================================
-- RBAC
-- ============================================================================

CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description, is_system) VALUES
    ('admin', 'Full system access', TRUE),
    ('operator', 'Manage bookings and lockers', TRUE),
    ('technician', 'Locker maintenance only', TRUE),
    ('customer', 'Standard customer access', TRUE);

CREATE TABLE permissions (
    id              SERIAL PRIMARY KEY,
    resource        VARCHAR(50) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    description     TEXT,
    UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
    role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- LOCATIONS & LOCKERS
-- ============================================================================

CREATE TABLE locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    
    street          VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(20) NOT NULL,
    country         VARCHAR(2) NOT NULL DEFAULT 'EE',
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    
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
    
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'maintenance', 'inactive')),
    
    contact_phone   VARCHAR(20),
    contact_email   VARCHAR(255),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_locations_status ON locations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_city ON locations(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_slug ON locations(slug) WHERE deleted_at IS NULL;

CREATE TABLE lockers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES locations(id),
    
    code            VARCHAR(20) NOT NULL,
    serial_number   VARCHAR(100) UNIQUE,
    
    hardware_type   VARCHAR(50) NOT NULL,
    firmware_version VARCHAR(20),
    last_heartbeat  TIMESTAMPTZ,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'online'
                    CHECK (status IN ('online', 'offline', 'maintenance', 'error')),
    
    config          JSONB DEFAULT '{}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(location_id, code)
);

CREATE INDEX idx_lockers_location ON lockers(location_id);
CREATE INDEX idx_lockers_status ON lockers(status);

-- ============================================================================
-- CATEGORIES & PRODUCTS
-- ============================================================================

CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID REFERENCES categories(id),
    
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    
    meta_title      VARCHAR(200),
    meta_description VARCHAR(500),
    
    icon            VARCHAR(50),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID NOT NULL REFERENCES categories(id),
    
    sku             VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    
    short_description VARCHAR(500),
    description     TEXT,
    specifications  JSONB DEFAULT '{}'::jsonb,
    
    images          JSONB DEFAULT '[]'::jsonb,
    videos          JSONB DEFAULT '[]'::jsonb,
    documents       JSONB DEFAULT '[]'::jsonb,
    
    hourly_rate     DECIMAL(10,2) NOT NULL,
    daily_rate      DECIMAL(10,2) NOT NULL,
    weekly_rate     DECIMAL(10,2),
    deposit_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    min_rental_hours INTEGER NOT NULL DEFAULT 1,
    max_rental_days  INTEGER NOT NULL DEFAULT 30,
    buffer_minutes   INTEGER NOT NULL DEFAULT 30,
    
    requires_deposit BOOLEAN NOT NULL DEFAULT TRUE,
    requires_id_verification BOOLEAN NOT NULL DEFAULT FALSE,
    min_age         INTEGER DEFAULT 18,
    requires_training BOOLEAN NOT NULL DEFAULT FALSE,
    
    weight_kg       DECIMAL(6,2),
    compartment_size VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (compartment_size IN ('small', 'medium', 'large', 'xlarge')),
    
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'discontinued')),
    
    meta_title      VARCHAR(200),
    meta_description VARCHAR(500),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug ON products(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || COALESCE(short_description, '')));

-- ============================================================================
-- COMPARTMENTS
-- ============================================================================

CREATE TABLE compartments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locker_id       UUID NOT NULL REFERENCES lockers(id),
    
    number          INTEGER NOT NULL,
    code            VARCHAR(20) NOT NULL,
    
    size            VARCHAR(20) NOT NULL
                    CHECK (size IN ('small', 'medium', 'large', 'xlarge')),
    dimensions      JSONB,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance', 'blocked')),
    
    is_door_open    BOOLEAN NOT NULL DEFAULT FALSE,
    last_opened_at  TIMESTAMPTZ,
    last_closed_at  TIMESTAMPTZ,
    
    assigned_product_id UUID REFERENCES products(id),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(locker_id, number)
);

CREATE INDEX idx_compartments_locker ON compartments(locker_id);
CREATE INDEX idx_compartments_status ON compartments(status);
CREATE INDEX idx_compartments_size ON compartments(size);

-- ============================================================================
-- PRODUCT INVENTORY
-- ============================================================================

CREATE TABLE product_inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id),
    location_id     UUID NOT NULL REFERENCES locations(id),
    
    serial_number   VARCHAR(100),
    asset_tag       VARCHAR(50),
    
    condition       VARCHAR(20) NOT NULL DEFAULT 'good'
                    CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'rented', 'maintenance', 'retired')),
    
    compartment_id  UUID REFERENCES compartments(id),
    
    last_inspection TIMESTAMPTZ,
    next_inspection TIMESTAMPTZ,
    maintenance_notes TEXT,
    
    total_rentals   INTEGER NOT NULL DEFAULT 0,
    total_revenue   DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON product_inventory(product_id);
CREATE INDEX idx_inventory_location ON product_inventory(location_id);
CREATE INDEX idx_inventory_status ON product_inventory(status);
CREATE INDEX idx_inventory_compartment ON product_inventory(compartment_id);

-- ============================================================================
-- USER ROLES (requires users and locations)
-- ============================================================================

CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    role_id         INTEGER NOT NULL REFERENCES roles(id),
    
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
-- BOOKINGS (CRITICAL TABLE)
-- ============================================================================

CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    booking_number  VARCHAR(20) NOT NULL UNIQUE,
    
    user_id         UUID NOT NULL REFERENCES users(id),
    
    product_id      UUID NOT NULL REFERENCES products(id),
    inventory_id    UUID NOT NULL REFERENCES product_inventory(id),
    location_id     UUID NOT NULL REFERENCES locations(id),
    compartment_id  UUID NOT NULL REFERENCES compartments(id),
    
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    
    picked_up_at    TIMESTAMPTZ,
    returned_at     TIMESTAMPTZ,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                        'pending',
                        'confirmed',
                        'active',
                        'completed',
                        'overdue',
                        'cancelled',
                        'expired'
                    )),
    
    hourly_rate     DECIMAL(10,2) NOT NULL,
    daily_rate      DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    deposit_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    extension_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    overdue_charges   DECIMAL(10,2) NOT NULL DEFAULT 0,
    damage_charges    DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    deposit_status  VARCHAR(20) DEFAULT 'pending'
                    CHECK (deposit_status IN ('pending', 'held', 'released', 'captured', 'refunded')),
    payment_status  VARCHAR(20) DEFAULT 'pending'
                    CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
    
    contract_signed_at TIMESTAMPTZ,
    contract_hash   VARCHAR(64),
    signature_type  VARCHAR(20)
                    CHECK (signature_type IN ('typed', 'smart_id', 'mobile_id', 'id_card')),
    
    source          VARCHAR(20) NOT NULL DEFAULT 'web'
                    CHECK (source IN ('web', 'mobile', 'admin', 'api')),
    
    notes           TEXT,
    admin_notes     TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    expires_at      TIMESTAMPTZ,
    
    idempotency_key VARCHAR(100),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id),
    
    CONSTRAINT valid_time_window CHECK (end_at > start_at),
    CONSTRAINT valid_duration CHECK (end_at - start_at <= INTERVAL '30 days')
);

-- CRITICAL: No overlapping bookings constraint
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING GIST (
        compartment_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'expired'));

CREATE INDEX idx_bookings_user ON bookings(user_id) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_compartment ON bookings(compartment_id) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_inventory ON bookings(inventory_id) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_location ON bookings(location_id) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_start ON bookings(start_at) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_end ON bookings(end_at) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_bookings_time_range ON bookings USING GIST (tstzrange(start_at, end_at));
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pending_expiry ON bookings(expires_at) WHERE status = 'pending';
CREATE INDEX idx_bookings_overdue ON bookings(end_at) WHERE status = 'active';
CREATE INDEX idx_bookings_number ON bookings(booking_number);
CREATE INDEX idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- BOOKING EXTENSIONS
-- ============================================================================

CREATE TABLE booking_extensions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    
    original_end_at TIMESTAMPTZ NOT NULL,
    new_end_at      TIMESTAMPTZ NOT NULL,
    
    additional_amount DECIMAL(10,2) NOT NULL,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    
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
    triggered_by    VARCHAR(20) NOT NULL
                    CHECK (triggered_by IN ('user', 'system', 'admin', 'payment', 'locker')),
    user_id         UUID REFERENCES users(id),
    
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_history_booking ON booking_status_history(booking_id);
CREATE INDEX idx_booking_history_created ON booking_status_history(created_at);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    
    external_id     VARCHAR(100),
    provider        VARCHAR(20) NOT NULL
                    CHECK (provider IN ('stripe', 'everypay', 'bank_transfer', 'cash')),
    
    type            VARCHAR(20) NOT NULL
                    CHECK (type IN ('rental', 'deposit', 'extension', 'overdue', 'damage')),
    
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
    
    authorized_at   TIMESTAMPTZ,
    captured_at     TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,
    refunded_at     TIMESTAMPTZ,
    
    failure_code    VARCHAR(50),
    failure_message TEXT,
    
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
    
    invoice_number  VARCHAR(30) NOT NULL UNIQUE,
    
    subtotal        DECIMAL(10,2) NOT NULL,
    tax_amount      DECIMAL(10,2) NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'issued', 'paid', 'void', 'overdue')),
    
    issued_at       TIMESTAMPTZ,
    due_at          TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    
    pdf_url         TEXT,
    
    line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- ============================================================================
-- LOCKER ACCESS TOKENS
-- ============================================================================

CREATE TABLE locker_access_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    compartment_id  UUID NOT NULL REFERENCES compartments(id),
    
    token_hash      VARCHAR(128) NOT NULL,
    token_type      VARCHAR(20) NOT NULL DEFAULT 'pin'
                    CHECK (token_type IN ('pin', 'qr', 'nfc', 'app')),
    
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ NOT NULL,
    
    max_uses        INTEGER NOT NULL DEFAULT 2,
    use_count       INTEGER NOT NULL DEFAULT 0,
    last_used_at    TIMESTAMPTZ,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_tokens_booking ON locker_access_tokens(booking_id);
CREATE INDEX idx_access_tokens_compartment ON locker_access_tokens(compartment_id);
CREATE INDEX idx_access_tokens_valid ON locker_access_tokens(valid_from, valid_until) WHERE status = 'active';

-- ============================================================================
-- LOCKER EVENTS (AUDIT LOG)
-- ============================================================================

CREATE TABLE locker_events (
    id              BIGSERIAL PRIMARY KEY,
    
    locker_id       UUID NOT NULL REFERENCES lockers(id),
    compartment_id  UUID REFERENCES compartments(id),
    booking_id      UUID REFERENCES bookings(id),
    user_id         UUID REFERENCES users(id),
    
    event_type      VARCHAR(50) NOT NULL,
    
    success         BOOLEAN NOT NULL DEFAULT TRUE,
    error_code      VARCHAR(50),
    error_message   TEXT,
    
    hardware_state  JSONB DEFAULT '{}'::jsonb,
    
    triggered_by    VARCHAR(20) NOT NULL
                    CHECK (triggered_by IN ('user', 'system', 'admin', 'hardware', 'scheduled')),
    
    request_id      VARCHAR(100),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locker_events_locker ON locker_events(locker_id);
CREATE INDEX idx_locker_events_compartment ON locker_events(compartment_id);
CREATE INDEX idx_locker_events_booking ON locker_events(booking_id);
CREATE INDEX idx_locker_events_created ON locker_events(created_at);
CREATE INDEX idx_locker_events_type ON locker_events(event_type);

-- ============================================================================
-- NOTIFICATION TEMPLATES
-- ============================================================================

CREATE TABLE notification_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    
    email_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    
    email_subject   TEXT,
    email_body_html TEXT,
    email_body_text TEXT,
    
    sms_body        TEXT,
    
    variables       JSONB DEFAULT '[]'::jsonb,
    
    send_delay_minutes INTEGER DEFAULT 0,
    
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id         UUID NOT NULL REFERENCES users(id),
    
    booking_id      UUID REFERENCES bookings(id),
    template_id     UUID REFERENCES notification_templates(id),
    
    channel         VARCHAR(20) NOT NULL
                    CHECK (channel IN ('email', 'sms', 'push')),
    
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    
    subject         TEXT,
    body            TEXT NOT NULL,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced')),
    
    external_id     VARCHAR(100),
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,
    
    error_code      VARCHAR(50),
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMPTZ,
    
    metadata        JSONB DEFAULT '{}'::jsonb,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_retry ON notifications(next_retry_at) WHERE status = 'failed';

-- ============================================================================
-- INCIDENTS
-- ============================================================================

CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    incident_number VARCHAR(20) NOT NULL UNIQUE,
    
    booking_id      UUID REFERENCES bookings(id),
    locker_id       UUID REFERENCES lockers(id),
    compartment_id  UUID REFERENCES compartments(id),
    user_id         UUID REFERENCES users(id),
    
    type            VARCHAR(50) NOT NULL,
    
    severity        VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'investigating', 'pending_action', 'resolved', 'closed')),
    
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    
    resolution      TEXT,
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id),
    
    assigned_to     UUID REFERENCES users(id),
    
    metadata        JSONB DEFAULT '{}'::jsonb,
    
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
    
    attachments     JSONB DEFAULT '[]'::jsonb,
    
    is_internal     BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_comments_incident ON incident_comments(incident_id);

-- ============================================================================
-- CONTRACT TEMPLATES
-- ============================================================================

CREATE TABLE contract_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    
    content_html    TEXT NOT NULL,
    content_text    TEXT NOT NULL,
    
    variables       JSONB DEFAULT '[]'::jsonb,
    
    requires_strong_auth BOOLEAN NOT NULL DEFAULT FALSE,
    
    version         INTEGER NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONTRACTS
-- ============================================================================

CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    template_id     UUID NOT NULL REFERENCES contract_templates(id),
    
    content_html    TEXT NOT NULL,
    content_text    TEXT NOT NULL,
    
    signature_type  VARCHAR(20) NOT NULL
                    CHECK (signature_type IN ('typed', 'smart_id', 'mobile_id', 'id_card')),
    signature_value TEXT,
    signer_name     VARCHAR(255) NOT NULL,
    signer_personal_code VARCHAR(20),
    
    content_hash    VARCHAR(64) NOT NULL,
    signature_hash  VARCHAR(64) NOT NULL,
    
    signed_at       TIMESTAMPTZ NOT NULL,
    
    ip_address      INET,
    user_agent      TEXT,
    
    pdf_url         TEXT,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_booking ON contracts(booking_id);
CREATE INDEX idx_contracts_user ON contracts(user_id);

-- ============================================================================
-- CONTENT MANAGEMENT
-- ============================================================================

CREATE TABLE content_pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    slug            VARCHAR(255) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    
    meta_title      VARCHAR(200),
    meta_description VARCHAR(500),
    
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    
    published_at    TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_content_pages_slug ON content_pages(slug);
CREATE INDEX idx_content_pages_status ON content_pages(status);

CREATE TABLE content_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
    
    type            VARCHAR(50) NOT NULL,
    
    content         JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    sort_order      INTEGER NOT NULL DEFAULT 0,
    
    is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_blocks_page ON content_blocks(page_id);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    
    user_id         UUID REFERENCES users(id),
    
    action          VARCHAR(50) NOT NULL,
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     UUID,
    
    old_values      JSONB,
    new_values      JSONB,
    
    ip_address      INET,
    user_agent      TEXT,
    request_id      VARCHAR(100),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    
    cron_expression VARCHAR(100) NOT NULL,
    timezone        VARCHAR(50) NOT NULL DEFAULT 'Europe/Tallinn',
    
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    
    last_run_at     TIMESTAMPTZ,
    last_run_status VARCHAR(20)
                    CHECK (last_run_status IN ('success', 'failed', 'running')),
    last_run_duration_ms INTEGER,
    last_error      TEXT,
    
    next_run_at     TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lockers_updated_at BEFORE UPDATE ON lockers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compartments_updated_at BEFORE UPDATE ON compartments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_inventory_updated_at BEFORE UPDATE ON product_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_pages_updated_at BEFORE UPDATE ON content_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at BEFORE UPDATE ON content_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Booking number generation
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
    FOR EACH ROW WHEN (NEW.booking_number IS NULL)
    EXECUTE FUNCTION generate_booking_number();

-- Incident number generation
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(incident_number FROM 10) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM incidents
    WHERE incident_number LIKE 'INC-' || year_part || '-%';
    
    NEW.incident_number := 'INC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_incident_number BEFORE INSERT ON incidents
    FOR EACH ROW WHEN (NEW.incident_number IS NULL)
    EXECUTE FUNCTION generate_incident_number();

-- Invoice number generation
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_part || '-%';
    
    NEW.invoice_number := 'INV-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number BEFORE INSERT ON invoices
    FOR EACH ROW WHEN (NEW.invoice_number IS NULL)
    EXECUTE FUNCTION generate_invoice_number();

-- Availability check function
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

-- ============================================================================
-- SEED DEFAULT DATA
-- ============================================================================

-- Default notification templates
INSERT INTO notification_templates (code, name, email_subject, email_body_html, email_body_text, sms_enabled, sms_body) VALUES
('booking_confirmed', 'Booking Confirmed', 
 'Your booking {{booking_number}} is confirmed',
 '<h1>Booking Confirmed</h1><p>Your booking {{booking_number}} has been confirmed.</p>',
 'Booking Confirmed. Your booking {{booking_number}} has been confirmed.',
 TRUE, 'Rentbox: Booking {{booking_number}} confirmed. Pickup: {{start_time}}'),
 
('rental_start_reminder', 'Rental Start Reminder',
 'Reminder: Your rental starts in {{hours}} hours',
 '<h1>Rental Starting Soon</h1><p>Your rental of {{product_name}} starts at {{start_time}}.</p>',
 'Your rental of {{product_name}} starts at {{start_time}}.',
 TRUE, 'Rentbox: Rental of {{product_name}} starts at {{start_time}}. PIN: {{access_pin}}'),

('return_reminder', 'Return Reminder',
 'Reminder: Please return {{product_name}} by {{end_time}}',
 '<h1>Return Reminder</h1><p>Please return {{product_name}} by {{end_time}} to avoid late fees.</p>',
 'Please return {{product_name}} by {{end_time}} to avoid late fees.',
 TRUE, 'Rentbox: Return {{product_name}} by {{end_time}}'),

('overdue_warning', 'Overdue Warning',
 'OVERDUE: {{product_name}} was due at {{end_time}}',
 '<h1>Rental Overdue</h1><p>Your rental of {{product_name}} is overdue. Late fees are now being applied.</p>',
 'Your rental of {{product_name}} is overdue. Late fees are now being applied.',
 TRUE, 'Rentbox OVERDUE: {{product_name}} was due at {{end_time}}. Return immediately.'),

('return_confirmed', 'Return Confirmed',
 'Return confirmed for booking {{booking_number}}',
 '<h1>Return Confirmed</h1><p>Thank you for returning {{product_name}}. Your deposit will be refunded within 3-5 business days.</p>',
 'Return confirmed. Your deposit will be refunded within 3-5 business days.',
 FALSE, NULL);

-- Default contract template
INSERT INTO contract_templates (code, name, content_html, content_text, requires_strong_auth) VALUES
('standard_rental', 'Standard Rental Agreement',
 '<h1>Rental Agreement</h1>
<p>This agreement is between Rentbox OÜ ("Lessor") and {{customer_name}} ("Lessee").</p>
<h2>1. Rental Terms</h2>
<p>The Lessee agrees to rent the following equipment:</p>
<ul><li>Product: {{product_name}}</li><li>Period: {{start_date}} to {{end_date}}</li><li>Total: €{{total_amount}}</li></ul>
<h2>2. Responsibilities</h2>
<p>The Lessee agrees to:</p>
<ul><li>Return equipment in the same condition</li><li>Not sublease the equipment</li><li>Pay for any damages</li><li>Return by the agreed time or pay late fees</li></ul>
<h2>3. Deposit</h2>
<p>A deposit of €{{deposit_amount}} will be held and returned upon satisfactory return of equipment.</p>',
 'RENTAL AGREEMENT

This agreement is between Rentbox OÜ ("Lessor") and {{customer_name}} ("Lessee").

1. RENTAL TERMS
Product: {{product_name}}
Period: {{start_date}} to {{end_date}}
Total: €{{total_amount}}

2. RESPONSIBILITIES
- Return equipment in same condition
- Not sublease the equipment  
- Pay for any damages
- Return by agreed time or pay late fees

3. DEPOSIT
€{{deposit_amount}} held, returned upon satisfactory return.',
 FALSE);

-- Default system config
INSERT INTO system_config (key, value, description) VALUES
('booking.pending_ttl_minutes', '15', 'Minutes before pending booking expires'),
('booking.reminder_hours_before', '[24, 2]', 'Hours before rental to send reminders'),
('booking.overdue_grace_minutes', '30', 'Grace period before marking as overdue'),
('payment.deposit_hold_days', '7', 'Days to hold deposit after return'),
('locker.door_timeout_seconds', '60', 'Seconds before door timeout warning'),
('notification.max_retries', '3', 'Maximum notification retry attempts');

COMMIT;
