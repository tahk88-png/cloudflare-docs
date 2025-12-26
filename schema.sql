-- Feature Flags & Maintenance Mode Database Schema
-- For Cloudflare D1 Database

-- Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT 0,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Mode Table
CREATE TABLE IF NOT EXISTS maintenance_mode (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL CHECK(mode IN ('none', 'full', 'partial')),
  message TEXT,
  enabled BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service Health Status (for failsafe mechanisms)
CREATE TABLE IF NOT EXISTS service_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('healthy', 'degraded', 'down')),
  last_check DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id TEXT,
  user_email TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users Table (for bypass authentication)
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  can_bypass_maintenance BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_service_health_name ON service_health(service_name);

-- Initial feature flags
INSERT OR IGNORE INTO feature_flags (flag_key, enabled, description) VALUES
  ('enable_booking', 1, 'Enable booking functionality'),
  ('enable_checkout', 1, 'Enable checkout process'),
  ('enable_discounts', 1, 'Enable discount codes'),
  ('enable_vouchers', 1, 'Enable voucher redemption'),
  ('enable_sms', 1, 'Enable SMS notifications'),
  ('enable_locker_access', 1, 'Enable locker access functionality'),
  ('enable_notifications', 1, 'Enable push notifications');

-- Initial maintenance mode (disabled)
INSERT OR IGNORE INTO maintenance_mode (mode, enabled, message) VALUES
  ('none', 0, '');

-- Initial service health statuses
INSERT OR IGNORE INTO service_health (service_name, status) VALUES
  ('locker', 'healthy'),
  ('payments', 'healthy');
