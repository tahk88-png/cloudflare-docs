-- Seed Products
INSERT INTO products (id, name, base_price_per_hour) VALUES
('p1', 'Heavy Duty Drill', 5.00),
('p2', 'Pressure Washer', 8.50),
('p3', 'Carpet Cleaner', 10.00);

-- Seed Compartments
INSERT INTO compartments (id, product_id, locker_number) VALUES
('c1', 'p1', 'A1'),
('c2', 'p1', 'A2'),
('c3', 'p2', 'B1'),
('c4', 'p3', 'C1');
