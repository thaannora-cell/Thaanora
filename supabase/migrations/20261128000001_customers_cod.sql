-- Phase 3B · A9: back-office Customers (tags, notes, figures) and COD protection.
-- Owner's rules (13 Nov 2026): never block cash on delivery. After N refusals at the door in the last
-- 12 months (counted by mobile number, guests too; Settings, default 2), a new order is flagged
-- "Call to confirm before sending". Staff-only tags: VIP, Wholesale, Trusted (Trusted skips the rule).

insert into public.settings (key, value, is_public)
values ('cod_call_after_refusals', '2'::jsonb, false)
on conflict (key) do nothing;

-- ── Staff notes and tags: a separate table, so a customer can never read them ───────────
create table if not exists public.customer_notes (
  customer_id  uuid primary key references public.customers (id) on delete cascade,
  tags         text[] not null default '{}' check (tags <@ array['vip', 'wholesale', 'trusted']::text[]),
  notes        text check (notes is null or char_length(notes) <= 1000),
  updated_by   uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists customer_notes_updated_at on public.customer_notes;
create trigger customer_notes_updated_at before update on public.customer_notes
  for each row execute function public.set_updated_at();
alter table public.customer_notes enable row level security;
revoke all on public.customer_notes from anon, authenticated;
grant select, insert, update on public.customer_notes to authenticated;
drop policy if exists "orders team manages customer notes" on public.customer_notes;
create policy "orders team manages customer notes" on public.customer_notes
  for all to authenticated using (public.has_staff_role('orders')) with check (public.has_staff_role('orders'));

-- Staff may reactivate (or deactivate) a profile; nothing else on customers is theirs to change.
grant update (status) on public.customers to authenticated;
drop policy if exists "orders team sets customer status" on public.customers;
create policy "orders team sets customer status" on public.customers
  for update to authenticated using (public.has_staff_role('orders')) with check (public.has_staff_role('orders'));

-- ── Orders: "call to confirm before sending" ────────────────────────────────────────
alter table public.orders add column if not exists needs_call boolean not null default false;
create index if not exists orders_phone_refused_idx on public.orders (customer_phone, status_changed_at) where status = 'refused_at_door';

-- Refusals at the door for a mobile number in the last 12 months (server only).
create or replace function public.refusal_count(p_phone text)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.orders
   where customer_phone = p_phone and status = 'refused_at_door'
     and status_changed_at > now() - interval '12 months'
$$;
revoke execute on function public.refusal_count(text) from public, anon, authenticated;
grant execute on function public.refusal_count(text) to service_role;

-- create_order also takes needs_call (worked out by the server).
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
    customer_id, discount_kind, discount_pct, perk_discount_sar, loyalty_level, customer_offer_id, birthday_year, needs_call
  ) values (
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'language', p_order->>'area',
    (p_order->>'packaging')::public.packaging_type, coalesce((p_order->>'is_gift')::boolean, false), p_order->>'gift_note',
    p_order->>'recipient_name', p_order->>'recipient_area', p_order->>'discount_code',
    (p_order->>'subtotal_sar')::numeric, coalesce((p_order->>'bundle_discount_sar')::numeric, 0), coalesce((p_order->>'code_discount_sar')::numeric, 0),
    (p_order->>'packaging_fee_sar')::numeric, (p_order->>'delivery_fee_sar')::numeric,
    (p_order->>'total_sar')::numeric, (p_order->>'vat_sar')::numeric,
    nullif(p_order->>'customer_id', '')::uuid, nullif(p_order->>'discount_kind', ''), nullif(p_order->>'discount_pct', '')::numeric,
    coalesce((p_order->>'perk_discount_sar')::numeric, 0), nullif(p_order->>'loyalty_level', ''),
    nullif(p_order->>'customer_offer_id', '')::uuid, nullif(p_order->>'birthday_year', '')::integer,
    coalesce((p_order->>'needs_call')::boolean, false)
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

-- ── Figures per customer for the back office (read as staff; RLS on the tables applies) ────
create or replace view public.customer_stats with (security_invoker = true) as
  select c.id as customer_id,
         count(o.id)::integer as orders,
         count(o.id) filter (where o.status = 'delivered_cash_collected')::integer as delivered_orders,
         coalesce(sum(o.total_sar) filter (where o.status = 'delivered_cash_collected'), 0)::numeric(12,2) as total_spent,
         coalesce(sum((select sum(oi.qty) from public.order_items oi where oi.order_id = o.id))
           filter (where o.status = 'delivered_cash_collected' and o.status_changed_at > now() - interval '12 months'), 0)::integer as suits_12m,
         max(o.created_at) as last_order_at,
         (select count(*) from public.orders r where r.customer_phone = c.phone and r.status = 'refused_at_door'
            and r.status_changed_at > now() - interval '12 months')::integer as refusals_12m
    from public.customers c
    left join public.orders o on o.customer_id = c.id
   group by c.id, c.phone;
revoke all on public.customer_stats from anon;
grant select on public.customer_stats to authenticated;
