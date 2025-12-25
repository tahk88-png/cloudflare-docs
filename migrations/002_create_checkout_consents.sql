-- Checkout consents table
CREATE TABLE IF NOT EXISTS checkout_consents (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  terms_version_id TEXT NOT NULL,
  consent_1 BOOLEAN DEFAULT FALSE,
  consent_2 BOOLEAN DEFAULT FALSE,
  signature_method TEXT, -- 'typed', 'smartid', 'mobileid', 'idcard'
  signer_name TEXT,
  signer_identifier_masked TEXT,
  signed_at TEXT,
  ip TEXT,
  user_agent TEXT,
  contract_hash TEXT NOT NULL,
  signature_ref TEXT, -- ASiC-E / provider reference for digital signatures
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'signed', 'verified'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (terms_version_id) REFERENCES terms_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_checkout_consents_cart ON checkout_consents(cart_id);
CREATE INDEX IF NOT EXISTS idx_checkout_consents_status ON checkout_consents(status);
