-- Seed sample data for demos

-- deterministic IDs for nicer demos
-- (these are valid UUIDs)
do $$
declare
  u_customer uuid := '11111111-1111-1111-1111-111111111111';
  u_admin uuid := '22222222-2222-2222-2222-222222222222';
  p_box uuid := '33333333-3333-3333-3333-333333333333';
  l_main uuid := '44444444-4444-4444-4444-444444444444';
  c_a1 uuid := '55555555-5555-5555-5555-555555555555';
  b1 uuid := '66666666-6666-6666-6666-666666666666';
  pay1 uuid := '77777777-7777-7777-7777-777777777777';
begin
  insert into users (id, email, phone, name, role)
  values
    (u_customer, 'customer@example.com', '+3720000000', 'Seed Customer', 'customer'),
    (u_admin, 'admin@example.com', '+3720000001', 'Seed Admin', 'admin')
  on conflict (email) do nothing;

  insert into products (id, name, description, active)
  values
    (p_box, 'Storage Box', 'Seed product for demo', true)
  on conflict do nothing;

  insert into lockers (id, name, location, adapter_type, adapter_config)
  values
    (l_main, 'Rentbox Locker #1', 'Tallinn', 'http', '{"baseUrl":"https://locker-api.example","apiKey":"dev"}'::jsonb)
  on conflict do nothing;

  insert into compartments (id, locker_id, code, status, adapter_ref)
  values
    (c_a1, l_main, 'A1', 'reserved', 'locker1/A1')
  on conflict do nothing;

  insert into bookings (id, external_id, user_id, product_id, compartment_id, start_at, end_at, status, paid)
  values
    (
      b1,
      'seed-booking-1',
      u_customer,
      p_box,
      c_a1,
      now() - interval '30 minutes',
      now() + interval '3 hours',
      'active',
      true
    )
  on conflict (external_id) do nothing;

  insert into payments (id, booking_id, amount_cents, currency, provider, external_id, status)
  values
    (pay1, b1, 1299, 'EUR', 'seed', 'seed-payment-1', 'paid')
  on conflict do nothing;

  insert into messages (booking_id, user_id, direction, channel, role, content)
  values
    (b1, u_customer, 'inbound', 'chat', 'customer', 'Hi! Where do I pick up my box?'),
    (b1, null, 'outbound', 'chat', 'support', 'Thanks! I can help. Please confirm the locker location you selected.')
  on conflict do nothing;
end $$;

