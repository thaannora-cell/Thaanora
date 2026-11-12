-- Phase 3B · A1: customer accounts ("My Thaanora").
-- A customer signs in with an email code; her profile holds name, Saudi mobile, language and birthday.
-- The mobile is her key, but it isn't proven until SMS sign-in arrives (phone_verified_at), so two
-- unverified profiles may share a number and nothing is linked by phone alone.

create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users (id) on delete set null,
  name              text not null check (char_length(btrim(name)) between 1 and 80),
  phone             text not null check (phone ~ '^\+9665[0-9]{8}$'),
  phone_verified_at timestamptz,
  email             text check (email is null or email = lower(email)),
  language          text not null default 'en' check (language in ('en', 'ar', 'ur', 'hi')),
  birthday          date check (birthday is null or birthday >= date '1920-01-01'), -- not in the future: checked by the server
  status            text not null default 'active' check (status in ('active', 'deactivated')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- One account per proven mobile number (SMS later); unproven numbers may repeat.
create unique index if not exists customers_verified_phone_key on public.customers (phone) where phone_verified_at is not null;
create index if not exists customers_phone_idx on public.customers (phone);
drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

-- The signed-in customer's own id (null for guests, staff without a profile and deactivated accounts).
create or replace function public.current_customer_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.customers where user_id = auth.uid() and status = 'active'
$$;
revoke execute on function public.current_customer_id() from public, anon;
grant execute on function public.current_customer_id() to authenticated;

-- Reads: a customer sees her own profile; the owner and orders team see all.
-- Writes: only the server (secret key) creates or changes profiles, after checking the session.
revoke all on public.customers from anon, authenticated;
grant select on public.customers to authenticated;
drop policy if exists "customer reads own profile" on public.customers;
create policy "customer reads own profile" on public.customers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "orders team reads customers" on public.customers;
create policy "orders team reads customers" on public.customers
  for select to authenticated using (public.has_staff_role('orders'));

-- Orders and requests remember which customer placed them (null = guest).
alter table public.orders   add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.requests add column if not exists customer_id uuid references public.customers (id) on delete set null;
create index if not exists orders_customer_idx   on public.orders (customer_id, created_at desc) where customer_id is not null;
create index if not exists requests_customer_idx on public.requests (customer_id, created_at desc) where customer_id is not null;

-- Customers read their own orders and requests (safe columns only) through the server, which checks
-- the session first; staff policies on these tables stay as they are. customer_id is set by the server.

-- How customers sign in: email now; SMS (Taqnyat) and both later. Public, so the website can read it.
insert into public.settings (key, value, is_public)
values ('customer_signin_method', '"email"'::jsonb, true)
on conflict (key) do nothing;
