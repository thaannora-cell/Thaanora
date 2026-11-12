-- Phase 3B · A2: notifications for signed-in customers (the bell in the header).
-- Text is not stored: each notification has a type and a few facts (data), and the website writes the
-- words in the customer's language. "Also on WhatsApp" puts it on the staff's "Messages to send" list
-- (no automatic WhatsApp sending until the WhatsApp Business API).

create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  type             text not null check (type in (
                     'order_status', 'request_update', 'back_in_stock', 'price_drop', 'new_arrival',
                     'new_offer', 'level_up', 'birthday_gift', 'announcement')),
  data             jsonb not null default '{}'::jsonb,
  read_at          timestamptz,
  whatsapp_status  text not null default 'none' check (whatsapp_status in ('none', 'pending', 'sent', 'skipped')),
  whatsapp_done_at timestamptz,
  whatsapp_done_by uuid references public.staff (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists notifications_customer_idx on public.notifications (customer_id, created_at desc);
create index if not exists notifications_unread_idx   on public.notifications (customer_id) where read_at is null;
create index if not exists notifications_whatsapp_idx on public.notifications (created_at) where whatsapp_status = 'pending';

-- Per type: website only, or website and WhatsApp. No row = website only.
create table if not exists public.notification_prefs (
  customer_id uuid not null references public.customers (id) on delete cascade,
  type        text not null check (type in (
                'order_status', 'request_update', 'back_in_stock', 'price_drop', 'new_arrival',
                'new_offer', 'level_up', 'birthday_gift', 'announcement')),
  channel     text not null default 'site' check (channel in ('site', 'site_whatsapp')),
  updated_at  timestamptz not null default now(),
  primary key (customer_id, type)
);

alter table public.notifications      enable row level security;
alter table public.notification_prefs enable row level security;

-- Notifications: a customer reads her own and can only mark them read; the orders team reads all.
-- New ones come from the triggers below (or the server); WhatsApp ticks are set by the server.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists "customer reads own notifications" on public.notifications;
create policy "customer reads own notifications" on public.notifications
  for select to authenticated using (customer_id = public.current_customer_id());
drop policy if exists "customer marks own notifications read" on public.notifications;
create policy "customer marks own notifications read" on public.notifications
  for update to authenticated
  using (customer_id = public.current_customer_id()) with check (customer_id = public.current_customer_id());
drop policy if exists "orders team reads notifications" on public.notifications;
create policy "orders team reads notifications" on public.notifications
  for select to authenticated using (public.has_staff_role('orders'));

-- Preferences: each customer manages her own.
revoke all on public.notification_prefs from anon, authenticated;
grant select, insert, update (channel, updated_at) on public.notification_prefs to authenticated;
drop policy if exists "customer manages own notification prefs" on public.notification_prefs;
create policy "customer manages own notification prefs" on public.notification_prefs
  for all to authenticated
  using (customer_id = public.current_customer_id()) with check (customer_id = public.current_customer_id());
drop policy if exists "orders team reads notification prefs" on public.notification_prefs;
create policy "orders team reads notification prefs" on public.notification_prefs
  for select to authenticated using (public.has_staff_role('orders'));

-- One place that creates a notification and decides whether it also goes on the WhatsApp list.
create or replace function public.notify_customer(p_customer uuid, p_type text, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_channel text;
begin
  if p_customer is null then return; end if;
  if not exists (select 1 from public.customers where id = p_customer and status = 'active') then return; end if;
  select channel into v_channel from public.notification_prefs where customer_id = p_customer and type = p_type;
  insert into public.notifications (customer_id, type, data, whatsapp_status)
  values (p_customer, p_type, coalesce(p_data, '{}'::jsonb),
          case when v_channel = 'site_whatsapp' then 'pending' else 'none' end);
end $$;
revoke execute on function public.notify_customer(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.notify_customer(uuid, text, jsonb) to service_role;

-- Order status changed (after "Waiting for confirmation") → tell the customer.
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is not null and new.status is distinct from old.status then
    perform public.notify_customer(new.customer_id, 'order_status',
      jsonb_build_object('orderNo', new.order_no, 'status', new.status));
  end if;
  return new;
end $$;
revoke execute on function public.notify_order_status() from public, anon, authenticated;
drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status after update of status on public.orders
  for each row execute function public.notify_order_status();

-- Request (sourcing, notify-me, pre-order) moved on → tell the customer.
create or replace function public.notify_request_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is not null and new.status is distinct from old.status and new.status <> 'new' then
    perform public.notify_customer(new.customer_id, 'request_update',
      jsonb_build_object('requestId', new.id, 'kind', new.type, 'status', new.status));
  end if;
  return new;
end $$;
revoke execute on function public.notify_request_status() from public, anon, authenticated;
drop trigger if exists requests_notify_status on public.requests;
create trigger requests_notify_status after update of status on public.requests
  for each row execute function public.notify_request_status();
