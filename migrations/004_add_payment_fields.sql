-- Add payment fields to checkout_consents table
ALTER TABLE checkout_consents ADD COLUMN payment_intent_id TEXT;
ALTER TABLE checkout_consents ADD COLUMN payment_status TEXT DEFAULT 'pending'; -- 'pending', 'processing', 'succeeded', 'failed', 'canceled'
ALTER TABLE checkout_consents ADD COLUMN payment_amount INTEGER; -- Amount in cents
ALTER TABLE checkout_consents ADD COLUMN payment_currency TEXT DEFAULT 'EUR';
ALTER TABLE checkout_consents ADD COLUMN payment_method TEXT; -- 'card', 'bank_transfer', etc.
ALTER TABLE checkout_consents ADD COLUMN payment_completed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_checkout_consents_payment_intent ON checkout_consents(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_checkout_consents_payment_status ON checkout_consents(payment_status);
