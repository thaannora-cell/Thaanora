-- Phase 3B · A7: Thaanora Circle (loyalty levels), birthday gift, personal offers and the
-- "one best discount" rule.
-- Rule (owner, 13 Nov 2026): an order gets ONE extra discount, the best of loyalty level, bundle,
-- code, birthday gift or a personal offer, and only on suits at full price (a suit on sale or in a
-- campaign keeps that price and gets no extra). The server works the discount out; the order keeps
-- which one was used.

-- ── Circle levels ─────────────────────────────────────────────────────────────
-- Counted on delivered suits in the last 12 months. Names and perk wording live in the website's
-- translation files (by slug); the owner edits rules and percentages in the back office (A10).
create table if not exists public.loyalty_levels (
  slug           text primary key check (slug ~ '^[a-z][a-z0-9_]{1,30}$'),
  sort_order     integer not null default 0,
  min_suits      integer not null check (min_suits between 1 and 1000),
  discount_pct   numeric(5,2) not null default 0 check (discount_pct between 0 and 50),
  free_gift_box  boolean not null default false,
  perks          text[] not null default '{}' check (perks <@ array['early_sale', 'eid_gift', 'priority_sourcing']::text[]),
  active         boolean not null default true,
  updated_at     timestamptz not null default now(),
  unique (min_suits)
);
drop trigger if exists loyalty_levels_updated_at on public.loyalty_levels;
create trigger loyalty_levels_updated_at before update on public.loyalty_levels
  for each row execute function public.set_updated_at();

alter table public.loyalty_levels enable row level security;
revoke all on public.loyalty_levels from anon, authenticated;
grant select on public.loyalty_levels to anon, authenticated; -- the benefits are public
drop policy if exists "anyone reads active levels" on public.loyalty_levels;
create policy "anyone reads active levels" on public.loyalty_levels
  for select to anon, authenticated using (active); -- the owner also sees inactive ones (policy below)
grant insert, update, delete on public.loyalty_levels to authenticated;
drop policy if exists "owner manages levels" on public.loyalty_levels;
create policy "owner manages levels" on public.loyalty_levels
  for all to authenticated using (public.has_staff_role('owner')) with check (public.has_staff_role('owner'));

insert into public.loyalty_levels (slug, sort_order, min_suits, discount_pct, free_gift_box, perks) values
  ('silver',  1,  3,  5, true, '{}'),
  ('gold',    2,  6, 10, true, '{early_sale}'),
  ('emerald', 3, 12, 15, true, '{eid_gift,priority_sourcing}')
on conflict (slug) do nothing;

-- Delivered suits in the last 12 months. Refused and cancelled orders never count.
create or replace function public.customer_suit_count(p_customer uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(oi.qty), 0)::integer
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
   where o.customer_id = p_customer
     and o.status = 'delivered_cash_collected'
     and o.status_changed_at > now() - interval '12 months'
$$;
revoke execute on function public.customer_suit_count(uuid) from public, anon, authenticated;
grant execute on function public.customer_suit_count(uuid) to service_role;

-- ── Birthday gift % (back office Settings) ──────────────────────────────────────
insert into public.settings (key, value, is_public)
values ('birthday_gift_pct', '5'::jsonb, true)
on conflict (key) do nothing;

-- ── Personal offers: a % for one customer, with dates. Used once. ──────────────
create table if not exists public.customer_offers (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id) on delete cascade,
  percent      numeric(5,2) not null check (percent > 0 and percent <= 50),
  title        jsonb not null default '{}'::jsonb check (jsonb_typeof(title) = 'object' and pg_column_size(title) < 2000),
  starts_at    timestamptz,
  ends_at      timestamptz,
  active       boolean not null default true,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists customer_offers_customer_idx on public.customer_offers (customer_id);

alter table public.customer_offers enable row level security;
revoke all on public.customer_offers from anon, authenticated;
grant select on public.customer_offers to authenticated;
drop policy if exists "customer reads own offers" on public.customer_offers;
create policy "customer reads own offers" on public.customer_offers
  for select to authenticated using (customer_id = public.current_customer_id());
drop policy if exists "orders team reads offers" on public.customer_offers;
create policy "orders team reads offers" on public.customer_offers
  for select to authenticated using (public.has_staff_role('orders'));
grant insert, update, delete on public.customer_offers to authenticated;
drop policy if exists "owner manages personal offers" on public.customer_offers;
create policy "owner manages personal offers" on public.customer_offers
  for all to authenticated using (public.has_staff_role('owner')) with check (public.has_staff_role('owner'));

-- ── Orders remember the one discount used ───────────────────────────────────────
-- bundle / code amounts stay in their own columns (as before); loyalty, birthday and personal offer
-- amounts go in perk_discount_sar.
alter table public.orders
  add column if not exists discount_kind     text check (discount_kind in ('bundle', 'code', 'loyalty', 'birthday', 'personal')),
  add column if not exists discount_pct      numeric(5,2),
  add column if not exists perk_discount_sar numeric(10,2) not null default 0 check (perk_discount_sar >= 0),
  add column if not exists loyalty_level     text,
  add column if not exists customer_offer_id uuid references public.customer_offers (id) on delete set null,
  add column if not exists birthday_year     integer;

update public.orders set discount_kind = case when code_discount_sar > 0 then 'code' else 'bundle' end
 where discount_kind is null and (code_discount_sar > 0 or bundle_discount_sar > 0);

-- A birthday gift once a year and a personal offer once, unless that order was cancelled or refused
-- (then she can use it again).
create unique index if not exists orders_one_birthday_gift on public.orders (customer_id, birthday_year)
  where discount_kind = 'birthday' and status not in ('cancelled', 'refused_at_door');
create unique index if not exists orders_one_personal_offer on public.orders (customer_offer_id)
  where discount_kind = 'personal' and status not in ('cancelled', 'refused_at_door');

-- create_order now also takes the customer and the discount details.
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns table (new_order_id uuid, new_order_no text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_no text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order has no items';
  end if;

  insert into public.orders (
    customer_name, customer_phone, language, area, packaging, is_gift, gift_note,
    recipient_name, recipient_area, discount_code,
    subtotal_sar, bundle_discount_sar, code_discount_sar, packaging_fee_sar, delivery_fee_sar, total_sar, vat_sar,
    customer_id, discount_kind, discount_pct, perk_discount_sar, loyalty_level, customer_offer_id, birthday_year
  ) values (
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'language', p_order->>'area',
    (p_order->>'packaging')::public.packaging_type, coalesce((p_order->>'is_gift')::boolean, false), p_order->>'gift_note',
    p_order->>'recipient_name', p_order->>'recipient_area', p_order->>'discount_code',
    (p_order->>'subtotal_sar')::numeric, coalesce((p_order->>'bundle_discount_sar')::numeric, 0), coalesce((p_order->>'code_discount_sar')::numeric, 0),
    (p_order->>'packaging_fee_sar')::numeric, (p_order->>'delivery_fee_sar')::numeric,
    (p_order->>'total_sar')::numeric, (p_order->>'vat_sar')::numeric,
    nullif(p_order->>'customer_id', '')::uuid, nullif(p_order->>'discount_kind', ''), nullif(p_order->>'discount_pct', '')::numeric,
    coalesce((p_order->>'perk_discount_sar')::numeric, 0), nullif(p_order->>'loyalty_level', ''),
    nullif(p_order->>'customer_offer_id', '')::uuid, nullif(p_order->>'birthday_year', '')::integer
  )
  returning id, order_no into v_id, v_no;

  insert into public.order_items (order_id, product_id, product_code, product_name, unit_price_sar, unit_cost_pkr, qty, wants_stitching)
  select v_id,
         (i->>'product_id')::uuid,
         i->>'product_code',
         i->>'product_name',
         (i->>'unit_price_sar')::numeric,
         nullif(i->>'unit_cost_pkr', '')::numeric,
         (i->>'qty')::integer,
         coalesce((i->>'wants_stitching')::boolean, false)
  from jsonb_array_elements(p_items) as i;

  if nullif(p_order->>'discount_code', '') is not null then
    update public.offers set used_count = used_count + 1
     where kind = 'code' and code = p_order->>'discount_code';
  end if;

  return query select v_id, v_no;
end $$;
revoke all on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;

-- ── Level up: when an order is delivered and her count crosses a level ────────────
create or replace function public.notify_level_up()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_after integer;
  v_qty integer;
  v_level text;
begin
  if new.customer_id is null or new.status <> 'delivered_cash_collected' or old.status = 'delivered_cash_collected' then
    return new;
  end if;
  v_after := public.customer_suit_count(new.customer_id);
  select coalesce(sum(qty), 0) into v_qty from public.order_items where order_id = new.id;
  select slug into v_level from public.loyalty_levels
   where active and min_suits <= v_after and min_suits > v_after - v_qty
   order by min_suits desc limit 1;
  if v_level is not null then
    perform public.notify_customer(new.customer_id, 'level_up', jsonb_build_object('level', v_level));
  end if;
  return new;
end $$;
revoke execute on function public.notify_level_up() from public, anon, authenticated;
drop trigger if exists orders_notify_level_up on public.orders;
create trigger orders_notify_level_up after update of status on public.orders
  for each row execute function public.notify_level_up();

-- ── Birthday gift notice: run daily; tells each customer whose gift window opens today
-- (7 days before her birthday, Riyadh date). 29 February counts as 28 February in other years.
create or replace function public.birthday_gift_notices(p_today date default (now() at time zone 'Asia/Riyadh')::date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_pct numeric;
  v_day date := p_today + 7; -- the birthday whose window opens today
  v_n integer := 0;
  r record;
begin
  select (value #>> '{}')::numeric into v_pct from public.settings where key = 'birthday_gift_pct';
  if coalesce(v_pct, 0) <= 0 then return 0; end if;
  for r in
    select c.id from public.customers c
     where c.status = 'active' and c.birthday is not null
       and extract(month from c.birthday) = extract(month from v_day)
       and (extract(day from c.birthday) = extract(day from v_day)
            or (extract(month from c.birthday) = 2 and extract(day from c.birthday) = 29 and extract(day from v_day) = 28
                and extract(day from (make_date(extract(year from v_day)::int, 3, 1) - 1)) = 28))
       and not exists (select 1 from public.notifications n
                        where n.customer_id = c.id and n.type = 'birthday_gift' and n.created_at > now() - interval '300 days')
  loop
    perform public.notify_customer(r.id, 'birthday_gift', jsonb_build_object('pct', v_pct));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function public.birthday_gift_notices(date) from public, anon, authenticated;
grant execute on function public.birthday_gift_notices(date) to service_role;
