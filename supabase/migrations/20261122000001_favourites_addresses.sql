-- Phase 3B · A4: favourites (the hearts on the rack, kept on her account) and saved addresses.

-- ── Favourites ─────────────────────────────────────────────────────────────────────────
create table if not exists public.favorites (
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (customer_id, product_id)
);
create index if not exists favorites_product_idx on public.favorites (product_id);
alter table public.favorites enable row level security;

revoke all on public.favorites from anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;
drop policy if exists "customer manages own favourites" on public.favorites;
create policy "customer manages own favourites" on public.favorites
  for all to authenticated
  using (customer_id = public.current_customer_id()) with check (customer_id = public.current_customer_id());
drop policy if exists "staff read favourites" on public.favorites;
create policy "staff read favourites" on public.favorites
  for select to authenticated using (public.is_staff());

-- ── Addresses (her own, plus gift recipients) ─────────────────────────────────────────
create table if not exists public.addresses (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.customers (id) on delete cascade,
  label           text not null check (char_length(btrim(label)) between 1 and 40),
  recipient_name  text not null check (char_length(btrim(recipient_name)) between 1 and 80),
  recipient_phone text check (recipient_phone is null or recipient_phone ~ '^\+9665[0-9]{8}$'),
  area            text not null check (char_length(area) between 1 and 120), -- one of the delivery areas
  district        text check (district is null or char_length(district) <= 80),
  details         text check (details is null or char_length(details) <= 300), -- street, building, floor
  lat             numeric(9,6) check (lat is null or lat between 15 and 33),     -- Saudi Arabia
  lng             numeric(9,6) check (lng is null or lng between 34 and 56),
  is_default      boolean not null default false,
  is_gift         boolean not null default false, -- someone she sends gifts to
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);
create index if not exists addresses_customer_idx on public.addresses (customer_id, created_at);
create unique index if not exists addresses_one_default on public.addresses (customer_id) where is_default;
drop trigger if exists addresses_updated_at on public.addresses;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();
alter table public.addresses enable row level security;

revoke all on public.addresses from anon, authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
drop policy if exists "customer manages own addresses" on public.addresses;
create policy "customer manages own addresses" on public.addresses
  for all to authenticated
  using (customer_id = public.current_customer_id()) with check (customer_id = public.current_customer_id());
drop policy if exists "orders team reads addresses" on public.addresses;
create policy "orders team reads addresses" on public.addresses
  for select to authenticated using (public.has_staff_role('orders'));

-- ── Favourite back in stock / cheaper → tell the customers who saved it ────────────────
create or replace function public.notify_favourite_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old numeric := old.price_sar * (100 - coalesce(old.sale_pct, 0)) / 100;
  v_new numeric := new.price_sar * (100 - coalesce(new.sale_pct, 0)) / 100;
  v_customer uuid;
begin
  if not new.visible then return new; end if;
  -- Came back: was sold out (or hidden), now visible with stock.
  if new.stock > 0 and (old.stock <= 0 or not old.visible) then
    for v_customer in select customer_id from public.favorites where product_id = new.id loop
      perform public.notify_customer(v_customer, 'back_in_stock', jsonb_build_object('code', new.code, 'name', new.name));
    end loop;
  -- Cheaper (own price or sale %), while in stock.
  elsif new.stock > 0 and round(v_new) < round(v_old) then
    for v_customer in select customer_id from public.favorites where product_id = new.id loop
      perform public.notify_customer(v_customer, 'price_drop', jsonb_build_object('code', new.code, 'name', new.name, 'price', round(v_new)::text));
    end loop;
  end if;
  return new;
end $$;
revoke execute on function public.notify_favourite_changes() from public, anon, authenticated;
drop trigger if exists products_notify_favourites on public.products;
create trigger products_notify_favourites after update of stock, price_sar, sale_pct, visible on public.products
  for each row execute function public.notify_favourite_changes();
