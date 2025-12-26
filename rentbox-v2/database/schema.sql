-- Rentbox v2 - Complete PostgreSQL Schema
-- Version: 2.0.0
-- PostgreSQL: 15+
-- Timezone: Europe/Tallinn

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Required for exclusion constraints

-- Set timezone
SET timezone = 'Europe/Tallinn';

-- ════════════════════════════════════════════════════════════════
-- ENUMS
-- ════════════════════════════════════════════════════════════════

CREATE TYPE booking_status AS ENUM (
  'pending',      -- Created but not paid
  'paid',         -- Paid, waiting for start time
  'active',       -- Currently in use
  'completed',    -- Returned successfully
  'overdue',      -- Past end_at, not returned
  'cancelled',    -- User/admin cancelled
  'expired'       -- Pending booking TTL expired
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE payment_method AS ENUM (
  'card',
  'bank_transfer',
  'cash',
  'invoice'
);

CREATE TYPE signature_type AS ENUM (
  'typed',        -- Simple text signature
  'smart_id',     -- Estonian Smart-ID
  'mobile_id',    -- Estonian Mobile-ID
  'id_card'       -- Estonian ID-card
);

CREATE TYPE user_role AS ENUM (
  'customer',
  'technician',
  'operator',
  'admin'
);

CREATE TYPE incident_status AS ENUM (
  'open',
  'investigating',
  'waiting_parts',
  'resolved',
  'closed'
);

CREATE TYPE incident_severity AS ENUM (
  'p0',  -- Critical - system down
  'p1',  -- High - degraded service
  'p2',  -- Medium - feature broken
  'p3'   -- Low - minor issue
);

CREATE TYPE locker_status AS ENUM (
  'online',
  'offline',
  'maintenance'
);

CREATE TYPE compartment_status AS ENUM (
  'available',
  'occupied',
  'maintenance',
  'damaged'
);

CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'push'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced'
);

CREATE TYPE content_block_type AS ENUM (
  'text',
  'heading',
  'image',
  'video',
  'cta',
  'divider',
  'code'
);

-- ════════════════════════════════════════════════════════════════
-- CORE TABLES
-- ════════════════════════════════════════════════════════════════

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role NOT NULL DEFAULT 'customer',
  
  -- Identity verification
  national_id VARCHAR(50), -- Estonian personal code
  national_id_verified_at TIMESTAMPTZ,
  
  -- Password (hashed)
  password_hash VARCHAR(255),
  
  -- Account status
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Business customers
  is_business BOOLEAN NOT NULL DEFAULT FALSE,
  company_name VARCHAR(255),
  company_registry_code VARCHAR(50),
  vat_number VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT phone_format CHECK (phone IS NULL OR phone ~* '^\+?[0-9]{8,15}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_national_id ON users(national_id) WHERE national_id IS NOT NULL;

-- User Sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Locations (Physical locations where lockers are installed)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Address
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL DEFAULT 'EE',
  
  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Operating hours (JSON: {"mon": {"open": "08:00", "close": "20:00"}, ...})
  operating_hours JSONB,
  
  -- Access instructions
  access_instructions TEXT,
  
  -- SEO
  description TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude);

-- Lockers (Physical locker units)
CREATE TABLE lockers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "L-001"
  name VARCHAR(255) NOT NULL,
  
  -- Hardware details
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  firmware_version VARCHAR(50),
  
  -- Connectivity
  mqtt_topic VARCHAR(255),
  http_endpoint VARCHAR(255),
  api_key_hash VARCHAR(255),
  
  -- Status
  status locker_status NOT NULL DEFAULT 'online',
  last_ping_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lockers_location_id ON lockers(location_id);
CREATE INDEX idx_lockers_code ON lockers(code);
CREATE INDEX idx_lockers_status ON lockers(status);

-- Compartments (Individual compartments within lockers)
CREATE TABLE compartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  locker_id UUID NOT NULL REFERENCES lockers(id) ON DELETE RESTRICT,
  number VARCHAR(10) NOT NULL, -- e.g., "C-05"
  
  -- Physical dimensions (cm)
  width_cm INTEGER,
  height_cm INTEGER,
  depth_cm INTEGER,
  
  -- Status
  status compartment_status NOT NULL DEFAULT 'available',
  
  -- Current state
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  last_opened_at TIMESTAMPTZ,
  last_closed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_locker_compartment UNIQUE(locker_id, number)
);

CREATE INDEX idx_compartments_locker_id ON compartments(locker_id);
CREATE INDEX idx_compartments_status ON compartments(status);

-- Product Categories
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX idx_product_categories_slug ON product_categories(slug);

-- Products (Tools available for rent)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  
  -- Pricing (in cents, EUR)
  price_per_hour INTEGER NOT NULL,
  price_per_day INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Specifications (JSONB for flexibility)
  specifications JSONB, -- {"power": "2000W", "weight": "3.5kg", ...}
  
  -- Media
  images JSONB, -- ["url1", "url2", ...]
  videos JSONB, -- ["url1", ...]
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Product Instances (Specific physical tool units)
CREATE TABLE product_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE RESTRICT,
  
  -- Instance tracking
  serial_number VARCHAR(100),
  condition_notes TEXT,
  
  -- Maintenance
  last_maintenance_at TIMESTAMPTZ,
  next_maintenance_due TIMESTAMPTZ,
  total_rental_hours INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_compartment_instance UNIQUE(compartment_id)
);

CREATE INDEX idx_product_instances_product_id ON product_instances(product_id);
CREATE INDEX idx_product_instances_compartment_id ON product_instances(compartment_id);
CREATE INDEX idx_product_instances_is_available ON product_instances(is_available);

-- ════════════════════════════════════════════════════════════════
-- BOOKING SYSTEM
-- ════════════════════════════════════════════════════════════════

-- Bookings (The core rental entity)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "BK-2024-001234"
  
  -- Relations
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_instance_id UUID NOT NULL REFERENCES product_instances(id) ON DELETE RESTRICT,
  compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  
  -- Time window (THE SOURCE OF TRUTH)
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  
  -- Actual times
  actual_start_at TIMESTAMPTZ, -- When customer picked up
  actual_end_at TIMESTAMPTZ,   -- When customer returned
  
  -- Status
  status booking_status NOT NULL DEFAULT 'pending',
  
  -- Pricing snapshot (immutable after creation)
  price_per_hour INTEGER NOT NULL,
  price_per_day INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  total_rental_cost INTEGER NOT NULL, -- Calculated at creation
  overdue_fees INTEGER NOT NULL DEFAULT 0,
  damage_fees INTEGER NOT NULL DEFAULT 0,
  
  -- Extensions
  original_end_at TIMESTAMPTZ, -- Set if booking is extended
  extension_count INTEGER NOT NULL DEFAULT 0,
  
  -- Access codes
  pickup_pin VARCHAR(10),
  return_pin VARCHAR(10),
  pin_expires_at TIMESTAMPTZ,
  
  -- Return process
  return_condition_notes TEXT,
  return_photos JSONB, -- ["url1", "url2", ...]
  requires_admin_verification BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  
  -- Locking (for preventing race conditions)
  idempotency_key VARCHAR(255) UNIQUE,
  lock_version INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_at > start_at),
  CONSTRAINT valid_actual_times CHECK (actual_end_at IS NULL OR actual_end_at >= actual_start_at),
  CONSTRAINT positive_costs CHECK (
    total_rental_cost >= 0 AND
    overdue_fees >= 0 AND
    damage_fees >= 0 AND
    deposit_amount >= 0
  ),
  
  -- ═══ CRITICAL: Prevent double bookings ═══
  -- No two bookings can overlap for the same compartment
  EXCLUDE USING GIST (
    compartment_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status NOT IN ('cancelled', 'expired'))
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_compartment_id ON bookings(compartment_id);
CREATE INDEX idx_bookings_product_instance_id ON bookings(product_instance_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time_range ON bookings(start_at, end_at);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX idx_bookings_idempotency_key ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Booking Status History (Audit trail for status changes)
CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status booking_status,
  to_status booking_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_status_history_booking_id ON booking_status_history(booking_id);

-- Maintenance Blocks (Prevents bookings during maintenance)
CREATE TABLE maintenance_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_maintenance_time CHECK (end_at > start_at),
  
  -- Prevent overlapping maintenance blocks
  EXCLUDE USING GIST (
    compartment_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  )
);

CREATE INDEX idx_maintenance_blocks_compartment_id ON maintenance_blocks(compartment_id);
CREATE INDEX idx_maintenance_blocks_time_range ON maintenance_blocks(start_at, end_at);

-- ════════════════════════════════════════════════════════════════
-- PAYMENT SYSTEM
-- ════════════════════════════════════════════════════════════════

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Amount (in cents)
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Payment details
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  
  -- External provider
  provider VARCHAR(50), -- e.g., "stripe", "montonio"
  provider_transaction_id VARCHAR(255),
  provider_metadata JSONB,
  
  -- Refunds
  refunded_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_refund CHECK (refunded_amount >= 0 AND refunded_amount <= amount)
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_transaction_id ON payments(provider_transaction_id);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "INV-2024-001234"
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Amounts (in cents)
  subtotal INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  
  -- Billing details (snapshot at invoice creation)
  billing_name VARCHAR(255) NOT NULL,
  billing_email VARCHAR(255) NOT NULL,
  billing_address JSONB NOT NULL,
  
  -- For business customers
  company_name VARCHAR(255),
  vat_number VARCHAR(50),
  
  -- Line items (JSONB array)
  line_items JSONB NOT NULL,
  
  -- Status
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  
  -- File storage
  pdf_url VARCHAR(500),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  
  CONSTRAINT positive_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_is_paid ON invoices(is_paid);

-- ════════════════════════════════════════════════════════════════
-- DIGITAL SIGNING
-- ════════════════════════════════════════════════════════════════

-- Rental Agreements (Digital contracts)
CREATE TABLE rental_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Agreement content
  terms_html TEXT NOT NULL, -- Full terms at time of signing
  terms_version VARCHAR(50) NOT NULL, -- e.g., "v2.1"
  
  -- Signature
  signature_type signature_type NOT NULL,
  signature_value TEXT NOT NULL, -- Typed name, Smart-ID session, etc.
  signature_metadata JSONB, -- Smart-ID/Mobile-ID verification details
  
  -- Cryptographic proof
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 of terms + booking details
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- IP tracking
  ip_address INET NOT NULL,
  user_agent TEXT,
  
  -- Status
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rental_agreements_booking_id ON rental_agreements(booking_id);
CREATE INDEX idx_rental_agreements_user_id ON rental_agreements(user_id);
CREATE INDEX idx_rental_agreements_signed_at ON rental_agreements(signed_at);

-- ════════════════════════════════════════════════════════════════
-- LOCKER ACCESS LOGS
-- ════════════════════════════════════════════════════════════════

-- Access Logs (Every physical access attempt)
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Access details
  action VARCHAR(20) NOT NULL, -- 'open', 'close', 'open_failed'
  method VARCHAR(50) NOT NULL, -- 'mqtt', 'http', 'pin', 'manual'
  
  -- Result
  success BOOLEAN NOT NULL,
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- Timing
  response_time_ms INTEGER,
  
  -- Context
  metadata JSONB,
  ip_address INET,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_logs_booking_id ON access_logs(booking_id);
CREATE INDEX idx_access_logs_compartment_id ON access_logs(compartment_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_access_logs_success ON access_logs(success);

-- ════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════

-- Notification Templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE NOT NULL, -- e.g., "booking_confirmed"
  name VARCHAR(255) NOT NULL,
  channel notification_channel NOT NULL,
  
  -- Content (supports template variables like {{booking_number}})
  subject VARCHAR(255), -- For email
  body TEXT NOT NULL,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE, -- Can't be unsubscribed
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_code ON notification_templates(code);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);

-- Notifications (Sent messages)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Delivery
  channel notification_channel NOT NULL,
  recipient VARCHAR(255) NOT NULL, -- email address or phone number
  
  -- Content (rendered from template)
  subject VARCHAR(255),
  body TEXT NOT NULL,
  
  -- Status
  status notification_status NOT NULL DEFAULT 'pending',
  
  -- Provider details
  provider VARCHAR(50), -- e.g., "resend", "twilio"
  provider_message_id VARCHAR(255),
  provider_response JSONB,
  
  -- Retry logic
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error tracking
  last_error TEXT
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_next_retry_at ON notifications(next_retry_at) WHERE status = 'failed';

-- ════════════════════════════════════════════════════════════════
-- INCIDENT MANAGEMENT
-- ════════════════════════════════════════════════════════════════

-- Incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "INC-2024-001234"
  
  -- Classification
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  
  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Relations (optional, depending on incident type)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  compartment_id UUID REFERENCES compartments(id) ON DELETE SET NULL,
  locker_id UUID REFERENCES lockers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Assignment
  reported_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  
  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  
  -- SLA tracking
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_booking_id ON incidents(booking_id);
CREATE INDEX idx_incidents_compartment_id ON incidents(compartment_id);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_incident_number ON incidents(incident_number);

-- Incident Comments
CREATE TABLE incident_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_comments_incident_id ON incident_comments(incident_id);

-- ════════════════════════════════════════════════════════════════
-- CONTENT CREATION ENGINE
-- ════════════════════════════════════════════════════════════════

-- Content Pages (Marketing, product descriptions, etc.)
CREATE TABLE content_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Content (structured as blocks)
  blocks JSONB NOT NULL, -- Array of content blocks
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  published_version INTEGER,
  
  -- Status
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_pages_slug ON content_pages(slug);
CREATE INDEX idx_content_pages_is_published ON content_pages(is_published);

-- Content Page Versions (Full version history)
CREATE TABLE content_page_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Snapshot of content at this version
  title VARCHAR(255) NOT NULL,
  blocks JSONB NOT NULL,
  meta_title VARCHAR(255),
  meta_description TEXT,
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_page_version UNIQUE(page_id, version)
);

CREATE INDEX idx_content_page_versions_page_id ON content_page_versions(page_id);

-- AI Suggestions (Logged AI assistance)
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Context
  context_type VARCHAR(50) NOT NULL, -- 'content_block', 'product_description', etc.
  context_id UUID,
  
  -- Input/Output
  original_text TEXT NOT NULL,
  suggested_text TEXT NOT NULL,
  suggestion_type VARCHAR(50) NOT NULL, -- 'clarity', 'tone', 'grammar', 'seo'
  
  -- Action taken
  accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  
  -- AI metadata
  model VARCHAR(50),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_context ON ai_suggestions(context_type, context_id);

-- ════════════════════════════════════════════════════════════════
-- AUDIT LOGS (COMPREHENSIVE)
-- ════════════════════════════════════════════════════════════════

-- Audit Logs (Every critical action)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- What
  resource_type VARCHAR(100) NOT NULL, -- 'booking', 'payment', 'user', etc.
  resource_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'accessed'
  
  -- Details
  changes JSONB, -- Before/after values
  metadata JSONB, -- Additional context
  
  -- Where
  ip_address INET,
  user_agent TEXT,
  
  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ════════════════════════════════════════════════════════════════
-- TRIGGERS & FUNCTIONS
-- ════════════════════════════════════════════════════════════════

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lockers_updated_at BEFORE UPDATE ON lockers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compartments_updated_at BEFORE UPDATE ON compartments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_instances_updated_at BEFORE UPDATE ON product_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_pages_updated_at BEFORE UPDATE ON content_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Booking status change logger
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO booking_status_history (
      booking_id,
      from_status,
      to_status,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_booking_status_changes AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_status_change();

-- Generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 9) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM bookings
  WHERE booking_number LIKE 'BK-' || year_str || '-%';
  
  NEW.booking_number := 'BK-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_number_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_number IS NULL)
  EXECUTE FUNCTION generate_booking_number();

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_str || '-%';
  
  NEW.invoice_number := 'INV-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- Generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM incidents
  WHERE incident_number LIKE 'INC-' || year_str || '-%';
  
  NEW.incident_number := 'INC-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_incident_number_trigger
  BEFORE INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.incident_number IS NULL)
  EXECUTE FUNCTION generate_incident_number();

-- ════════════════════════════════════════════════════════════════
-- HELPER VIEWS
-- ════════════════════════════════════════════════════════════════

-- Active bookings view (commonly queried)
CREATE VIEW active_bookings AS
SELECT
  b.*,
  u.email AS user_email,
  u.first_name,
  u.last_name,
  p.name AS product_name,
  c.number AS compartment_number,
  l.code AS locker_code,
  loc.name AS location_name
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN product_instances pi ON b.product_instance_id = pi.id
JOIN products p ON pi.product_id = p.id
JOIN compartments c ON b.compartment_id = c.id
JOIN lockers l ON c.locker_id = l.id
JOIN locations loc ON b.location_id = loc.id
WHERE b.status IN ('paid', 'active', 'overdue');

-- Overdue bookings view
CREATE VIEW overdue_bookings AS
SELECT
  b.*,
  u.email AS user_email,
  u.phone AS user_phone,
  EXTRACT(EPOCH FROM (NOW() - b.end_at))/3600 AS hours_overdue
FROM bookings b
JOIN users u ON b.user_id = u.id
WHERE b.status = 'active'
  AND b.end_at < NOW();

-- Available compartments view
CREATE VIEW available_compartments AS
SELECT
  c.*,
  l.code AS locker_code,
  loc.name AS location_name,
  loc.id AS location_id,
  pi.product_id,
  p.name AS product_name
FROM compartments c
JOIN lockers l ON c.locker_id = l.id
JOIN locations loc ON l.location_id = loc.id
LEFT JOIN product_instances pi ON c.id = pi.compartment_id AND pi.is_available = TRUE
LEFT JOIN products p ON pi.product_id = p.id
WHERE c.status = 'available'
  AND l.status = 'online'
  AND loc.is_active = TRUE;

-- ════════════════════════════════════════════════════════════════
-- SECURITY
-- ════════════════════════════════════════════════════════════════

-- Row Level Security (RLS) can be enabled per table
-- Example: Users can only see their own bookings
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY user_bookings ON bookings
--   FOR SELECT
--   USING (user_id = current_setting('app.current_user_id')::UUID);

-- ════════════════════════════════════════════════════════════════
-- COMMENTS (Documentation)
-- ════════════════════════════════════════════════════════════════

COMMENT ON TABLE bookings IS 'Core rental entity - represents a time-based reservation of a compartment';
COMMENT ON COLUMN bookings.start_at IS 'Scheduled start time (THE SOURCE OF TRUTH for availability)';
COMMENT ON COLUMN bookings.end_at IS 'Scheduled end time (THE SOURCE OF TRUTH for availability)';
COMMENT ON COLUMN bookings.actual_start_at IS 'When customer actually picked up (may differ from start_at)';
COMMENT ON COLUMN bookings.actual_end_at IS 'When customer actually returned (may differ from end_at)';
COMMENT ON CONSTRAINT bookings_compartment_id_tstzrange_excl ON bookings IS 'CRITICAL: Prevents double bookings';

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all critical actions - NEVER delete';
COMMENT ON TABLE access_logs IS 'Physical locker access attempts - used for dispute resolution';
COMMENT ON TABLE rental_agreements IS 'Legally binding digital contracts with cryptographic proof';

-- ════════════════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════════════════
