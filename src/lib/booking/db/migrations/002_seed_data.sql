-- Migration: 002_seed_data.sql
-- Seed data for development/testing

-- Sample locker
INSERT INTO products (
	id,
	name,
	description,
	base_price_per_hour,
	base_price_per_day,
	deposit_amount,
	locker_id,
	total_compartments,
	peak_hours_multiplier,
	weekend_multiplier,
	long_rental_discount_threshold_hours,
	long_rental_discount_percent,
	peak_hours_start,
	peak_hours_end
) VALUES
(
	'550e8400-e29b-41d4-a716-446655440000',
	'Power Drill Set',
	'Professional cordless drill with multiple bits and accessories',
	500, -- €5.00 per hour
	5000, -- €50.00 per day
	10000, -- €100.00 deposit
	'660e8400-e29b-41d4-a716-446655440000',
	3,
	1.5, -- 50% increase during peak hours
	1.2, -- 20% increase on weekends
	24, -- Discount after 24 hours
	10, -- 10% discount
	'17:00',
	'22:00'
),
(
	'550e8400-e29b-41d4-a716-446655440001',
	'Circular Saw',
	'Heavy-duty circular saw with safety features',
	800, -- €8.00 per hour
	8000, -- €80.00 per day
	15000, -- €150.00 deposit
	'660e8400-e29b-41d4-a716-446655440000',
	2,
	1.5,
	1.2,
	24,
	10,
	'17:00',
	'22:00'
),
(
	'550e8400-e29b-41d4-a716-446655440002',
	'Angle Grinder',
	'Professional angle grinder with multiple discs',
	600, -- €6.00 per hour
	6000, -- €60.00 per day
	12000, -- €120.00 deposit
	'660e8400-e29b-41d4-a716-446655440000',
	2,
	1.5,
	1.2,
	24,
	10,
	'17:00',
	'22:00'
)
ON CONFLICT DO NOTHING;

-- Sample compartments
INSERT INTO compartments (locker_id, product_id, compartment_number, is_active)
SELECT 
	'660e8400-e29b-41d4-a716-446655440000',
	p.id,
	'C' || generate_series(1, p.total_compartments),
	true
FROM products p
WHERE p.locker_id = '660e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;
