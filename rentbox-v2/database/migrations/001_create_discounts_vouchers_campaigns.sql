-- ============================================================================
-- Rentbox v2: Discounts, Vouchers & Campaigns System
-- Database Schema (PostgreSQL)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DISCOUNT CODES
-- ============================================================================
CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_time')),
    value INTEGER NOT NULL CHECK (value > 0),
    -- For percentage: value is 0-100 (e.g., 10 = 10%)
    -- For fixed: value is in cents (e.g., 1500 = €15.00)
    -- For free_time: value is in minutes (e.g., 60 = 1 hour)
    
    is_stackable BOOLEAN NOT NULL DEFAULT false,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    min_order_amount INTEGER CHECK (min_order_amount >= 0), -- in cents
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_dates CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT valid_uses CHECK (max_uses IS NULL OR used_count <= max_uses)
);

CREATE INDEX idx_discount_codes_code ON discount_codes(UPPER(code));
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active, valid_from, valid_until);
CREATE INDEX idx_discount_codes_uses ON discount_codes(max_uses, used_count) WHERE max_uses IS NOT NULL;

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    rules JSONB NOT NULL DEFAULT '{}',
    -- Rules structure:
    -- {
    --   "time": { "date_range": {...}, "weekdays": [...], "time_windows": [...] },
    --   "location": { "locker_ids": [...], "cities": [...], "regions": [...] },
    --   "product": { "product_ids": [...], "categories": [...], "brands": [...] },
    --   "user": { "first_time_only": boolean, "returning_only": boolean, "b2b_only": boolean, "user_ids": [...] },
    --   "booking": { "min_duration": integer, "max_duration": integer, "min_order_value": integer }
    -- }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_active ON campaigns(is_active);
CREATE INDEX idx_campaigns_rules ON campaigns USING GIN(rules);

-- ============================================================================
-- DISCOUNT-CAMPAIGN JUNCTION
-- ============================================================================
CREATE TABLE discount_campaigns (
    discount_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_id, campaign_id)
);

CREATE INDEX idx_discount_campaigns_discount ON discount_campaigns(discount_id);
CREATE INDEX idx_discount_campaigns_campaign ON discount_campaigns(campaign_id);

-- ============================================================================
-- VOUCHERS / GIFT CARDS
-- ============================================================================
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    initial_amount INTEGER NOT NULL CHECK (initial_amount > 0), -- in cents
    remaining_amount INTEGER NOT NULL CHECK (remaining_amount >= 0), -- in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Metadata
    purchased_by_user_id UUID,
    recipient_email VARCHAR(255),
    gift_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_amounts CHECK (remaining_amount <= initial_amount),
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE INDEX idx_vouchers_code ON vouchers(UPPER(code));
CREATE INDEX idx_vouchers_active ON vouchers(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_vouchers_user ON vouchers(purchased_by_user_id) WHERE purchased_by_user_id IS NOT NULL;

-- ============================================================================
-- VOUCHER REDEMPTIONS (Audit Trail)
-- ============================================================================
CREATE TABLE voucher_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0), -- in cents
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    redeemed_by_user_id UUID,
    
    -- Accounting fields
    liability_reduced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voucher_redemptions_voucher ON voucher_redemptions(voucher_id);
CREATE INDEX idx_voucher_redemptions_booking ON voucher_redemptions(booking_id);
CREATE INDEX idx_voucher_redemptions_date ON voucher_redemptions(redeemed_at);

-- ============================================================================
-- DISCOUNT REDEMPTIONS (Audit Trail)
-- ============================================================================
CREATE TABLE discount_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL,
    discount_amount INTEGER NOT NULL CHECK (discount_amount > 0), -- in cents
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    redeemed_by_user_id UUID,
    campaign_id UUID REFERENCES campaigns(id),
    
    -- Store context for reporting
    booking_subtotal INTEGER NOT NULL, -- in cents
    booking_duration_minutes INTEGER
);

CREATE INDEX idx_discount_redemptions_discount ON discount_redemptions(discount_code_id);
CREATE INDEX idx_discount_redemptions_booking ON discount_redemptions(booking_id);
CREATE INDEX idx_discount_redemptions_date ON discount_redemptions(redeemed_at);
CREATE INDEX idx_discount_redemptions_campaign ON discount_redemptions(campaign_id) WHERE campaign_id IS NOT NULL;

-- ============================================================================
-- GIFT CARD PURCHASES (Accounting)
-- ============================================================================
CREATE TABLE gift_card_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
    payment_intent_id VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0), -- in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    purchased_by_user_id UUID,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Accounting: Creates liability
    liability_recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gift_card_purchases_voucher ON gift_card_purchases(voucher_id);
CREATE INDEX idx_gift_card_purchases_payment ON gift_card_purchases(payment_intent_id);
CREATE INDEX idx_gift_card_purchases_date ON gift_card_purchases(purchased_at);

-- ============================================================================
-- USER DISCOUNT USAGE TRACKING (Per-user limits)
-- ============================================================================
CREATE TABLE user_discount_usage (
    user_id UUID NOT NULL,
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    first_used_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, discount_code_id)
);

CREATE INDEX idx_user_discount_usage_user ON user_discount_usage(user_id);
CREATE INDEX idx_user_discount_usage_discount ON user_discount_usage(discount_code_id);

-- ============================================================================
-- AUDIT LOG (Admin Actions)
-- ============================================================================
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'discount_create', 'voucher_disable', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'discount_code', 'voucher', 'campaign'
    entity_id UUID NOT NULL,
    changes JSONB, -- Before/after state
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_admin_audit_log_date ON admin_audit_log(created_at);
CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log(admin_user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate unique voucher code
CREATE OR REPLACE FUNCTION generate_voucher_code(length INTEGER DEFAULT 12)
RETURNS VARCHAR AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars
    result VARCHAR;
    exists_check BOOLEAN;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..length LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
        END LOOP;
        
        -- Check if code already exists (case-insensitive)
        SELECT EXISTS(SELECT 1 FROM vouchers WHERE UPPER(code) = UPPER(result))
        INTO exists_check;
        
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if voucher is redeemable
CREATE OR REPLACE FUNCTION is_voucher_redeemable(voucher_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record
    FROM vouchers
    WHERE UPPER(code) = UPPER(voucher_code);
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    IF NOT v_record.is_active THEN
        RETURN false;
    END IF;
    
    IF v_record.remaining_amount <= 0 THEN
        RETURN false;
    END IF;
    
    IF v_record.expires_at IS NOT NULL AND v_record.expires_at < NOW() THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS (Reporting)
-- ============================================================================

-- Outstanding voucher liability
CREATE VIEW voucher_liability_summary AS
SELECT
    SUM(remaining_amount) as total_outstanding_liability,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW()) as expired_count,
    SUM(remaining_amount) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW()) as expired_amount,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at > NOW()) as active_count,
    SUM(remaining_amount) FILTER (WHERE expires_at IS NOT NULL AND expires_at > NOW()) as active_amount
FROM vouchers
WHERE is_active = true;

-- Voucher sales vs redemptions
CREATE VIEW voucher_sales_redemptions AS
SELECT
    DATE_TRUNC('month', gcp.purchased_at) as month,
    SUM(gcp.amount) as total_sales,
    COUNT(DISTINCT gcp.voucher_id) as vouchers_sold,
    COALESCE(SUM(vr.amount), 0) as total_redemptions,
    COUNT(DISTINCT vr.id) as redemption_count
FROM gift_card_purchases gcp
LEFT JOIN voucher_redemptions vr ON DATE_TRUNC('month', vr.redeemed_at) = DATE_TRUNC('month', gcp.purchased_at)
GROUP BY DATE_TRUNC('month', gcp.purchased_at)
ORDER BY month DESC;

-- Discount usage by campaign
CREATE VIEW discount_usage_by_campaign AS
SELECT
    c.id as campaign_id,
    c.name as campaign_name,
    COUNT(DISTINCT dr.discount_code_id) as discount_codes_count,
    COUNT(dr.id) as total_redemptions,
    SUM(dr.discount_amount) as total_discount_amount,
    AVG(dr.discount_amount) as avg_discount_amount
FROM campaigns c
LEFT JOIN discount_campaigns dc ON c.id = dc.campaign_id
LEFT JOIN discount_redemptions dr ON dc.discount_id = dr.discount_code_id
GROUP BY c.id, c.name;
