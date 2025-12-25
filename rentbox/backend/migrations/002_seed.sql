-- Seed products + compartments (example locker inventory)

INSERT INTO products (id, name, currency, pricing_json, deposit_cents, is_active)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Makita Drill (18V)',
    'eur',
    '{
      "base": { "hour_cents": 500, "day_cents": 2400 },
      "peakHours": { "startHour": 18, "endHour": 22, "multiplier": 1.25 },
      "weekendMultiplier": 1.2,
      "longRentalDiscounts": [
        { "minHours": 24, "percentOff": 10 },
        { "minHours": 72, "percentOff": 20 }
      ]
    }'::jsonb,
    2000,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Kärcher Pressure Washer',
    'eur',
    '{
      "base": { "hour_cents": 900, "day_cents": 4200 },
      "peakHours": { "startHour": 18, "endHour": 22, "multiplier": 1.15 },
      "weekendMultiplier": 1.25,
      "longRentalDiscounts": [
        { "minHours": 24, "percentOff": 8 },
        { "minHours": 72, "percentOff": 15 }
      ]
    }'::jsonb,
    5000,
    TRUE
  )
ON CONFLICT DO NOTHING;

-- 3 compartments for each product (example lockers)
INSERT INTO compartments (product_id, label, is_active)
SELECT '11111111-1111-1111-1111-111111111111', v.label, TRUE
FROM (VALUES ('A1'), ('A2'), ('A3')) AS v(label)
ON CONFLICT DO NOTHING;

INSERT INTO compartments (product_id, label, is_active)
SELECT '22222222-2222-2222-2222-222222222222', v.label, TRUE
FROM (VALUES ('B1'), ('B2'), ('B3')) AS v(label)
ON CONFLICT DO NOTHING;

