-- Rentbox AI Employee v1.0 schema

create extension if not exists pgcrypto;

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text unique,
  phone text,
  name text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'agent')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  active boolean not null default true
);

create table if not exists lockers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  location text,
  adapter_type text not null default 'http' check (adapter_type in ('http', 'mqtt')),
  adapter_config jsonb not null default '{}'::jsonb
);

create table if not exists compartments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locker_id uuid not null references lockers(id) on delete cascade,
  code text not null,
  status text not null default 'available' check (status in ('available', 'reserved', 'out_of_service')),
  adapter_ref text,
  unique (locker_id, code)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  external_id text unique,
  user_id uuid references users(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  compartment_id uuid not null references compartments(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'completed')),
  paid boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_bookings_compartment on bookings(compartment_id);
create index if not exists idx_bookings_user on bookings(user_id);
create index if not exists idx_bookings_end_at on bookings(end_at);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'EUR',
  provider text,
  external_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_payments_booking on payments(booking_id);
create index if not exists idx_payments_status on payments(status);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null,
  source text not null default 'webhook',
  external_id text,
  booking_id uuid references bookings(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text
);

create index if not exists idx_events_created_at on events(created_at);
create index if not exists idx_events_type on events(type);
create index if not exists idx_events_booking on events(booking_id);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  booking_id uuid references bookings(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  category text not null default 'general',
  title text not null,
  description text,
  last_event_id uuid references events(id) on delete set null,
  assigned_to text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_booking on tickets(booking_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text not null check (channel in ('chat', 'email', 'sms', 'system')),
  role text not null default 'customer' check (role in ('customer', 'support', 'ops', 'sales', 'ai', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_messages_booking_created on messages(booking_id, created_at);
create index if not exists idx_messages_user_created on messages(user_id, created_at);

create table if not exists ai_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid references bookings(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  action_type text not null,
  reason text,
  outcome text,
  status text not null default 'success' check (status in ('success', 'skipped', 'failed')),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_ai_actions_created on ai_actions(created_at);
create index if not exists idx_ai_actions_booking on ai_actions(booking_id);
create index if not exists idx_ai_actions_type on ai_actions(action_type);

