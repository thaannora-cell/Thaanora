-- Phase 3B · A8: returns, reviews, and the privacy tools' database side.
-- Owner's rules (13 Nov 2026): a return can be asked for within 3 days of delivery (Settings); fabric
-- not cut, not washed, no stains. She chooses a bank-transfer refund (staff ask for the IBAN on
-- WhatsApp; never stored here) or an exchange. Pickup is free; the original delivery fee is refunded
-- only when the suit was wrong or faulty. Every refund or exchange becomes a Zoho Books credit note.
-- Reviews: stars + text, only for suits she received, shown after staff approval.

insert into public.settings (key, value, is_public)
values ('return_window_days', '3'::jsonb, true),
       ('zoho_refund_account_id', '""'::jsonb, false) -- optional: the Zoho bank account refunds are paid from
on conflict (key) do nothing;

-- ── Returns ──────────────────────────────────────────────────────────────────────
create sequence if not exists public.return_number_seq start 1001;

create table if not exists public.returns (
  id                   uuid primary key default gen_random_uuid(),
  return_no            text not null unique default ('RT-' || nextval('public.return_number_seq')),
  order_id             uuid not null references public.orders (id) on delete restrict,
  customer_id          uuid references public.customers (id) on delete set null,
  status               text not null default 'requested'
                         check (status in ('requested', 'approved', 'rejected', 'received', 'refunded', 'exchanged', 'cancelled')),
  resolution           text not null check (resolution in ('refund', 'exchange')),
  reason               text not null check (reason in ('changed_mind', 'wrong_item', 'faulty', 'not_as_pictured', 'other')),
  details              text check (details is null or char_length(details) <= 600),
  refund_sar           numeric(10,2) not null default 0 check (refund_sar >= 0), -- worked out by the server
  includes_delivery    boolean not null default false, -- wrong or faulty suit: delivery fee refunded too
  staff_note           text check (staff_note is null or char_length(staff_note) <= 600),
  exchange_order_id    uuid references public.orders (id) on delete set null,
  credit_note_status   text not null default 'none' check (credit_note_status in ('none', 'pending', 'issued', 'failed')),
  credit_note_zoho_id  text,
  credit_note_no       text,
  refund_recorded      boolean not null default false, -- the bank-transfer refund is recorded in Zoho
  credit_applied       boolean not null default false, -- exchange: the credit is applied to the new invoice
  zoho_error           text,
  status_changed_at    timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists returns_status_idx on public.returns (status, created_at desc);
create index if not exists returns_customer_idx on public.returns (customer_id, created_at desc);
create index if not exists returns_exchange_idx on public.returns (exchange_order_id) where exchange_order_id is not null;
-- One return per order (a refused or withdrawn request doesn't count).
create unique index if not exists returns_one_per_order on public.returns (order_id) where status not in ('rejected', 'cancelled');

create table if not exists public.return_items (
  return_id      uuid not null references public.returns (id) on delete cascade,
  order_item_id  uuid not null references public.order_items (id) on delete restrict,
  qty            integer not null check (qty between 1 and 10),
  primary key (return_id, order_item_id)
);

drop trigger if exists returns_updated_at on public.returns;
create trigger returns_updated_at before update on public.returns
  for each row execute function public.set_updated_at();

-- A new return must belong to a delivered order of the same customer, inside the return window.
create or replace function public.check_return_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_order record;
  v_days integer;
begin
  select status, status_changed_at, customer_id into v_order from public.orders where id = new.order_id;
  if v_order.status is distinct from 'delivered_cash_collected' then raise exception 'return_not_delivered'; end if;
  if v_order.customer_id is distinct from new.customer_id then raise exception 'return_not_hers'; end if;
  select coalesce((value #>> '{}')::integer, 3) into v_days from public.settings where key = 'return_window_days';
  if v_order.status_changed_at < now() - make_interval(days => coalesce(v_days, 3)) then raise exception 'return_window_closed'; end if;
  new.status := 'requested';
  return new;
end $$;
revoke execute on function public.check_return_insert() from public, anon, authenticated;
drop trigger if exists returns_check_insert on public.returns;
create trigger returns_check_insert before insert on public.returns
  for each row execute function public.check_return_insert();

-- Status moves only forwards; refunded/exchanged need the Zoho credit note first. Stock goes back
-- on the shelf when the suit is received.
create or replace function public.return_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ok boolean;
begin
  if new.status = old.status then return new; end if;
  ok := case old.status
    when 'requested' then new.status in ('approved', 'rejected', 'cancelled')
    when 'approved'  then new.status in ('received', 'cancelled')
    when 'received'  then new.status in ('refunded', 'exchanged')
    else false end;
  if not ok then raise exception 'return_bad_status % -> %', old.status, new.status; end if;
  if new.status in ('refunded', 'exchanged') and new.credit_note_status <> 'issued' then
    raise exception 'return_needs_credit_note';
  end if;
  if new.status = 'exchanged' and new.exchange_order_id is null then raise exception 'return_needs_exchange_order'; end if;
  new.status_changed_at := now();
  if new.status = 'received' then
    insert into public.stock_movements (product_id, delta, reason, order_id, note, created_by)
    select oi.product_id, ri.qty, 'return', new.order_id, new.return_no, (select auth.uid())
      from public.return_items ri join public.order_items oi on oi.id = ri.order_item_id
     where ri.return_id = new.id and oi.product_id is not null;
  end if;
  return new;
end $$;
revoke execute on function public.return_status_change() from public, anon, authenticated;
drop trigger if exists returns_status_change on public.returns;
create trigger returns_status_change before update of status on public.returns
  for each row execute function public.return_status_change();

alter table public.returns enable row level security;
alter table public.return_items enable row level security;
revoke all on public.returns, public.return_items from anon, authenticated;
grant select on public.returns, public.return_items to authenticated;
-- Staff change the status, their note and the exchange order; the money and Zoho fields are the server's.
grant update (status, staff_note, exchange_order_id) on public.returns to authenticated;

drop policy if exists "customer reads own returns" on public.returns;
create policy "customer reads own returns" on public.returns
  for select to authenticated using (customer_id = public.current_customer_id());
drop policy if exists "orders team reads returns" on public.returns;
create policy "orders team reads returns" on public.returns
  for select to authenticated using (public.has_staff_role('orders'));
drop policy if exists "orders team updates returns" on public.returns;
create policy "orders team updates returns" on public.returns
  for update to authenticated using (public.has_staff_role('orders')) with check (public.has_staff_role('orders'));
drop policy if exists "read return items" on public.return_items;
create policy "read return items" on public.return_items
  for select to authenticated using (exists (
    select 1 from public.returns r where r.id = return_id
      and (r.customer_id = public.current_customer_id() or public.has_staff_role('orders'))));

-- ── Notifications: "Your return RT-1001: approved" ──────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'order_status', 'request_update', 'back_in_stock', 'price_drop', 'new_arrival',
  'new_offer', 'level_up', 'birthday_gift', 'announcement', 'return_update', 'review_reply'));
alter table public.notification_prefs drop constraint if exists notification_prefs_type_check;
alter table public.notification_prefs add constraint notification_prefs_type_check check (type in (
  'order_status', 'request_update', 'back_in_stock', 'price_drop', 'new_arrival',
  'new_offer', 'level_up', 'birthday_gift', 'announcement', 'return_update', 'review_reply'));

create or replace function public.notify_return_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is not null and new.status is distinct from old.status and new.status <> 'cancelled' then
    perform public.notify_customer(new.customer_id, 'return_update',
      jsonb_build_object('returnNo', new.return_no, 'status', new.status,
        'orderNo', (select order_no from public.orders where id = new.order_id)));
  end if;
  return new;
end $$;
revoke execute on function public.notify_return_status() from public, anon, authenticated;
drop trigger if exists returns_notify_status on public.returns;
create trigger returns_notify_status after update of status on public.returns
  for each row execute function public.notify_return_status();

-- ── Reviews ─────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  customer_id  uuid references public.customers (id) on delete set null,
  order_id     uuid references public.orders (id) on delete set null,
  rating       smallint not null check (rating between 1 and 5),
  body         text not null default '' check (char_length(body) <= 800),
  author_name  text not null check (char_length(author_name) between 1 and 40), -- first name + initial
  language     text not null default 'en' check (language in ('en', 'ar', 'ur', 'hi')),
  status       text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  reply        text check (reply is null or char_length(reply) <= 600),
  replied_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (customer_id, product_id)
);
create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc) where status = 'published';
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);
drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
-- Everyone reads published reviews, without who wrote them beyond the display name.
grant select (id, product_id, rating, body, author_name, language, status, reply, replied_at, created_at) on public.reviews to anon, authenticated;
drop policy if exists "anyone reads published reviews" on public.reviews;
create policy "anyone reads published reviews" on public.reviews
  for select to anon, authenticated using (status = 'published');
drop policy if exists "catalogue team reads reviews" on public.reviews;
create policy "catalogue team reads reviews" on public.reviews
  for select to authenticated using (public.has_staff_role('catalogue'));
-- Catalogue team publishes, hides and replies. Customers write through the server only.
grant update (status, reply, replied_at) on public.reviews to authenticated;
drop policy if exists "catalogue team moderates reviews" on public.reviews;
create policy "catalogue team moderates reviews" on public.reviews
  for update to authenticated using (public.has_staff_role('catalogue')) with check (public.has_staff_role('catalogue'));

-- A reply to a published review → tell her.
create or replace function public.notify_review_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is not null and new.reply is not null and new.reply is distinct from old.reply then
    perform public.notify_customer(new.customer_id, 'review_reply',
      jsonb_build_object('name', (select name from public.products where id = new.product_id)));
  end if;
  return new;
end $$;
revoke execute on function public.notify_review_reply() from public, anon, authenticated;
drop trigger if exists reviews_notify_reply on public.reviews;
create trigger reviews_notify_reply after update of reply on public.reviews
  for each row execute function public.notify_review_reply();

-- Star summary per suit for the shop (published reviews only).
create or replace view public.review_summary with (security_invoker = true) as
  select product_id, round(avg(rating)::numeric, 1) as avg_rating, count(*)::integer as review_count
    from public.reviews where status = 'published' group by product_id;
grant select on public.review_summary to anon, authenticated;
