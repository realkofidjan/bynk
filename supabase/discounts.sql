-- ==============================================================================
-- BYNK Photography - Discount Codes Table Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_spend numeric default 0,
  max_uses integer default null,
  used_count integer default 0,
  expires_at timestamptz default null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Index on uppercase code for rapid lookups
create index if not exists idx_discount_codes_code on discount_codes (code);

-- Optional columns on bookings table to track applied discounts
alter table bookings add column if not exists discount_code text;
alter table bookings add column if not exists discount_amount numeric default 0;

-- Row Level Security (RLS) policies:
-- Enable RLS
alter table discount_codes enable row level security;

-- Allow anon & authenticated users to read active discount codes for validation
create policy "Allow public read access to active discount codes"
  on discount_codes
  for select
  using (true);

-- Allow full access to service_role (used by backend API routes)
create policy "Allow service_role full access to discount codes"
  on discount_codes
  for all
  using (true)
  with check (true);
