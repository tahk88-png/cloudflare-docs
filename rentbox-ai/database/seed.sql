-- Rentbox AI Employee Seed Data

-- Insert sample users
INSERT INTO users (email, phone, full_name) VALUES
  ('john.doe@example.com', '+37212345678', 'John Doe'),
  ('jane.smith@example.com', '+37212345679', 'Jane Smith'),
  ('alice.johnson@example.com', '+37212345680', 'Alice Johnson'),
  ('bob.wilson@example.com', '+37212345681', 'Bob Wilson');

-- Insert sample products
INSERT INTO products (name, description, price_per_hour, price_per_day, category) VALUES
  ('Electric Scooter', 'High-speed electric scooter for urban mobility', 5.00, 30.00, 'transportation'),
  ('Camping Tent', '4-person weatherproof camping tent', 3.00, 20.00, 'outdoor'),
  ('Power Drill', 'Professional cordless power drill', 4.00, 25.00, 'tools'),
  ('Camera Kit', 'DSLR camera with lenses and accessories', 8.00, 50.00, 'electronics'),
  ('Bicycle', 'Mountain bike with helmet and lock', 4.00, 25.00, 'transportation');

-- Insert sample lockers
INSERT INTO lockers (location, address, latitude, longitude, total_compartments, api_endpoint, api_type) VALUES
  ('Tallinn Central Station', 'Toompuiestee 35, 10133 Tallinn', 59.4370, 24.7536, 12, 'https://api.lockers.rentbox.ee/tallinn-central', 'http'),
  ('Tartu University', 'Ülikooli 18, 50090 Tartu', 58.3806, 26.7251, 8, 'mqtt://mqtt.lockers.rentbox.ee:1883', 'mqtt'),
  ('Pärnu Beach', 'Ranna pst 1, 80012 Pärnu', 58.3859, 24.4971, 10, 'https://api.lockers.rentbox.ee/parnu-beach', 'http');

-- Insert compartments for each locker
-- Tallinn Central Station (12 compartments)
INSERT INTO compartments (locker_id, compartment_number, size, status) VALUES
  (1, 'A1', 'small', 'available'),
  (1, 'A2', 'small', 'available'),
  (1, 'A3', 'small', 'available'),
  (1, 'A4', 'medium', 'available'),
  (1, 'A5', 'medium', 'available'),
  (1, 'A6', 'medium', 'available'),
  (1, 'A7', 'medium', 'available'),
  (1, 'B1', 'large', 'available'),
  (1, 'B2', 'large', 'available'),
  (1, 'B3', 'large', 'available'),
  (1, 'B4', 'large', 'available'),
  (1, 'B5', 'large', 'available');

-- Tartu University (8 compartments)
INSERT INTO compartments (locker_id, compartment_number, size, status) VALUES
  (2, 'T1', 'small', 'available'),
  (2, 'T2', 'small', 'available'),
  (2, 'T3', 'medium', 'available'),
  (2, 'T4', 'medium', 'available'),
  (2, 'T5', 'medium', 'available'),
  (2, 'T6', 'large', 'available'),
  (2, 'T7', 'large', 'available'),
  (2, 'T8', 'large', 'available');

-- Pärnu Beach (10 compartments)
INSERT INTO compartments (locker_id, compartment_number, size, status) VALUES
  (3, 'P1', 'small', 'available'),
  (3, 'P2', 'small', 'available'),
  (3, 'P3', 'small', 'available'),
  (3, 'P4', 'medium', 'available'),
  (3, 'P5', 'medium', 'available'),
  (3, 'P6', 'medium', 'available'),
  (3, 'P7', 'large', 'available'),
  (3, 'P8', 'large', 'available'),
  (3, 'P9', 'large', 'available'),
  (3, 'P10', 'large', 'available');

-- Insert sample bookings
INSERT INTO bookings (user_id, product_id, compartment_id, status, start_time, end_time, total_amount, deposit_amount, pickup_code, return_code) VALUES
  (1, 1, 1, 'active', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 30.00, 50.00, 'PICK123', 'RET123'),
  (2, 2, 8, 'confirmed', NOW() + INTERVAL '1 day', NOW() + INTERVAL '4 days', 60.00, 100.00, 'PICK456', 'RET456'),
  (3, 4, 14, 'overdue', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour', 100.00, 200.00, 'PICK789', 'RET789'),
  (4, 3, 20, 'pending', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '1 day', 25.00, 50.00, 'PICK101', 'RET101');

-- Update compartments with current bookings
UPDATE compartments SET status = 'occupied', current_booking_id = 1 WHERE id = 1;
UPDATE compartments SET status = 'reserved', current_booking_id = 2 WHERE id = 8;
UPDATE compartments SET status = 'occupied', current_booking_id = 3 WHERE id = 14;
UPDATE compartments SET status = 'reserved', current_booking_id = 4 WHERE id = 20;

-- Insert sample payments
INSERT INTO payments (booking_id, amount, payment_type, status, payment_method, transaction_id, payment_provider, paid_at) VALUES
  (1, 80.00, 'booking', 'completed', 'card', 'txn_1234567890', 'stripe', NOW() - INTERVAL '2 hours'),
  (2, 160.00, 'booking', 'completed', 'card', 'txn_1234567891', 'stripe', NOW() - INTERVAL '1 day'),
  (3, 300.00, 'booking', 'completed', 'card', 'txn_1234567892', 'stripe', NOW() - INTERVAL '2 days'),
  (4, 75.00, 'booking', 'pending', 'card', 'txn_1234567893', 'stripe', NULL);

-- Insert sample events
INSERT INTO events (event_type, entity_type, entity_id, payload, processed) VALUES
  ('payment.completed', 'payment', 1, '{"payment_id": 1, "amount": 80.00, "booking_id": 1}', true),
  ('locker.opened', 'booking', 1, '{"booking_id": 1, "compartment_id": 1, "timestamp": "2025-12-25T10:00:00Z"}', true),
  ('locker.open_failed', 'booking', 3, '{"booking_id": 3, "compartment_id": 14, "error": "door_jammed", "timestamp": "2025-12-24T15:30:00Z"}', false),
  ('payment.completed', 'payment', 2, '{"payment_id": 2, "amount": 160.00, "booking_id": 2}', true);

-- Insert sample tickets
INSERT INTO tickets (booking_id, user_id, title, description, priority, status, category) VALUES
  (3, 3, 'Locker door won''t open', 'I tried to open the locker with my code but it''s not working. I need the item urgently.', 'high', 'open', 'locker_issue'),
  (1, 1, 'Question about return time', 'Can I extend my rental for 2 more hours?', 'low', 'resolved', 'other');

-- Insert message templates
INSERT INTO message_templates (name, type, subject, body_template, variables, category) VALUES
  ('pickup_instructions_email', 'email', 'Your {{product_name}} is ready for pickup!', 
   'Hi {{customer_name}},

Your {{product_name}} is ready for pickup at {{locker_location}}.

Pickup Details:
- Locker: {{locker_location}}
- Compartment: {{compartment_number}}
- Pickup Code: {{pickup_code}}
- Valid until: {{end_time}}

Instructions:
1. Go to the locker at {{locker_location}}
2. Enter your pickup code: {{pickup_code}}
3. Retrieve your item from compartment {{compartment_number}}

Need help? Reply to this email or contact our support team.

Best regards,
Rentbox Team',
   '["customer_name", "product_name", "locker_location", "compartment_number", "pickup_code", "end_time"]',
   'pickup_instructions'),
   
  ('pickup_instructions_sms', 'sms', NULL,
   'Rentbox: Your {{product_name}} is ready at {{locker_location}}, compartment {{compartment_number}}. Code: {{pickup_code}}. Valid until {{end_time}}.',
   '["product_name", "locker_location", "compartment_number", "pickup_code", "end_time"]',
   'pickup_instructions'),
   
  ('reminder_2hours', 'email', 'Reminder: Return your {{product_name}} soon',
   'Hi {{customer_name}},

This is a friendly reminder that your rental of {{product_name}} is due to be returned in 2 hours.

Return Details:
- Return Location: {{locker_location}}
- Compartment: {{compartment_number}}
- Return Code: {{return_code}}
- Due Time: {{end_time}}

Please return the item on time to avoid late fees.

Best regards,
Rentbox Team',
   '["customer_name", "product_name", "locker_location", "compartment_number", "return_code", "end_time"]',
   'reminder'),
   
  ('overdue_notice', 'email', 'OVERDUE: Please return {{product_name}} immediately',
   'Hi {{customer_name}},

Your rental of {{product_name}} is now overdue. The return deadline was {{end_time}}.

Late fees are accumulating at €5 per hour. Please return the item immediately to avoid additional charges.

Return Location: {{locker_location}}, Compartment {{compartment_number}}
Return Code: {{return_code}}

If you''re experiencing issues, please contact support immediately.

Best regards,
Rentbox Team',
   '["customer_name", "product_name", "locker_location", "compartment_number", "return_code", "end_time"]',
   'overdue'),
   
  ('overdue_sms', 'sms', NULL,
   'Rentbox OVERDUE: Return {{product_name}} to {{locker_location}} immediately. Late fees apply. Code: {{return_code}}',
   '["product_name", "locker_location", "return_code"]',
   'overdue');

-- Insert sample automation rules
INSERT INTO automation_rules (name, description, trigger_type, trigger_config, conditions, actions, active) VALUES
  ('Send pickup instructions on payment', 
   'Automatically send pickup instructions when payment is completed',
   'event',
   '{"event_type": "payment.completed"}',
   '{"payment_status": "completed", "booking_status": ["confirmed", "active"]}',
   '["send_email:pickup_instructions_email", "send_sms:pickup_instructions_sms"]',
   true),
   
  ('Send 2-hour return reminder',
   'Send reminder 2 hours before rental end time',
   'time_based',
   '{"schedule": "*/15 * * * *", "time_before_end": "2 hours"}',
   '{"booking_status": "active", "reminder_sent": false}',
   '["send_email:reminder_2hours"]',
   true),
   
  ('Create ticket on repeated open failures',
   'Create support ticket if locker fails to open more than twice',
   'event',
   '{"event_type": "locker.open_failed"}',
   '{"failure_count": ">= 2"}',
   '["create_ticket:high"]',
   true),
   
  ('Send overdue notices',
   'Send overdue notices for rentals past their end time',
   'time_based',
   '{"schedule": "0 * * * *"}',
   '{"booking_status": "overdue"}',
   '["send_email:overdue_notice", "send_sms:overdue_sms"]',
   true);
