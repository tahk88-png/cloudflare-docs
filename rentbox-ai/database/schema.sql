-- Rentbox AI Employee Database Schema v1.0

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table (rental items)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_per_hour DECIMAL(10, 2),
  price_per_day DECIMAL(10, 2),
  category VARCHAR(100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lockers table
CREATE TABLE IF NOT EXISTS lockers (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  total_compartments INTEGER NOT NULL,
  api_endpoint VARCHAR(500),
  api_type VARCHAR(50) DEFAULT 'http', -- 'http' or 'mqtt'
  mqtt_topic VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compartments table
CREATE TABLE IF NOT EXISTS compartments (
  id SERIAL PRIMARY KEY,
  locker_id INTEGER NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
  compartment_number VARCHAR(50) NOT NULL,
  size VARCHAR(50), -- 'small', 'medium', 'large'
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'occupied', 'maintenance', 'reserved'
  current_booking_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(locker_id, compartment_number)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  compartment_id INTEGER NOT NULL REFERENCES compartments(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'active', 'completed', 'cancelled', 'overdue'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  actual_return_time TIMESTAMP,
  total_amount DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  pickup_code VARCHAR(50),
  return_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to compartments after bookings table is created
ALTER TABLE compartments ADD CONSTRAINT fk_current_booking 
  FOREIGN KEY (current_booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_type VARCHAR(50) NOT NULL, -- 'booking', 'deposit', 'late_fee', 'refund'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'cash'
  transaction_id VARCHAR(255),
  payment_provider VARCHAR(100),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table (webhook events from external systems)
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL, -- 'payment.completed', 'locker.opened', 'locker.failed', 'booking.created', etc.
  entity_type VARCHAR(50), -- 'booking', 'payment', 'locker', 'user'
  entity_id INTEGER,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type_processed ON events(event_type, processed);
CREATE INDEX idx_events_created_at ON events(created_at);

-- Messages table (for chat widget)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(100) NOT NULL,
  booking_id INTEGER REFERENCES bookings(id),
  user_id INTEGER REFERENCES users(id),
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  agent_type VARCHAR(50), -- 'support', 'ops', 'sales' (for assistant messages)
  tool_calls JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_booking ON messages(booking_id);

-- AI Actions table (audit log for all AI actions)
CREATE TABLE IF NOT EXISTS ai_actions (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100) NOT NULL, -- 'send_email', 'send_sms', 'create_ticket', 'open_locker', 'reminder_sent', etc.
  agent_type VARCHAR(50), -- 'support', 'ops', 'sales', 'automation'
  booking_id INTEGER REFERENCES bookings(id),
  user_id INTEGER REFERENCES users(id),
  ticket_id INTEGER,
  reason TEXT NOT NULL,
  outcome VARCHAR(50) NOT NULL, -- 'success', 'failed', 'skipped'
  outcome_details TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_actions_type ON ai_actions(action_type, created_at);
CREATE INDEX idx_ai_actions_booking ON ai_actions(booking_id);
CREATE INDEX idx_ai_actions_user ON ai_actions(user_id);

-- Tickets table (for customer support issues)
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
  category VARCHAR(100), -- 'locker_issue', 'payment_issue', 'product_issue', 'other'
  assigned_to VARCHAR(100),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_status ON tickets(status, priority);
CREATE INDEX idx_tickets_booking ON tickets(booking_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);

-- Rate limiting table for outbound messages
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message_type VARCHAR(50) NOT NULL, -- 'email', 'sms'
  count INTEGER DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, message_type, window_start)
);

CREATE INDEX idx_rate_limits_user ON rate_limits(user_id, message_type, window_start);

-- Automation rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL, -- 'event', 'time_based', 'condition'
  trigger_config JSONB NOT NULL,
  conditions JSONB,
  actions JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- 'email', 'sms'
  subject VARCHAR(500), -- for emails
  body_template TEXT NOT NULL,
  variables JSONB, -- list of available variables
  category VARCHAR(100), -- 'pickup_instructions', 'reminder', 'overdue', 'support'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
