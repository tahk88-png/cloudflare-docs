-- Incident Management Database Schema
-- Incidents are never deleted - full audit trail maintained

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('locker_not_open', 'payment_access_failed', 'tool_damaged', 'missing_return')),
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK(status IN ('open', 'investigating', 'resolved')) DEFAULT 'open',
  booking_id TEXT,
  locker_id TEXT,
  description TEXT NOT NULL,
  resolution_notes TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS incident_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('created', 'updated', 'status_changed', 'severity_changed', 'resolved')),
  changed_by TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_booking_id ON incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_incidents_locker_id ON incidents(locker_id);
CREATE INDEX IF NOT EXISTS idx_audit_incident_id ON incident_audit_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON incident_audit_log(created_at);
