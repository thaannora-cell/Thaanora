-- Back office: staff sign in with an email one-time code; three roles enforced by Row Level Security.
--   owner     everything
--   orders    orders, order lines and customer requests
--   catalogue products, product photos and stock
-- Anyone who signs in without an active staff row can read and change nothing.

-- ───────────────────────────── Roles ─────────────────────────────
alter type public.staff_role rename value 'staff' to 'orders';
alter type public.staff_role add value if not exists 'catalogue';
alter table public.staff alter column role drop default;   -- every staff member gets a role on purpose

-- ───────────────────── Staff are found by email ─────────────────
alter table public.staff alter column phone drop not null;
alter table public.staff
  add column email text unique
    check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add constraint staff_has_contact check (email is not null or phone is not null);

-- True for an active owner, or an active staff member with one of the given roles.
-- (Compares as text so this migration can use the role just added above.)
create or replace function public.has_staff_role(variadic roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid())
      and s.active
      and (s.role::text = 'owner' or s.role::text = any (roles))
  );
$$;

-- Link a sign-in account to its staff row by email (or phone), whichever is created first.
create or replace function public.link_staff_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.staff
     set user_id = new.id
   where user_id is null
     and ((new.email is not null and email = lower(new.email))
       or (new.phone is not null and phone is not null
           and regexp_replace(phone, '\D', '', 'g') = regexp_replace(new.phone, '\D', '', 'g')));
  return new;
end $$;

drop trigger if exists on_auth_user_created_link_staff on auth.users;
create trigger on_auth_user_created_link_staff
  after insert or update of email, phone on auth.users
  for each row execute function public.link_staff_user();

create or replace function public.link_staff_row()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    new.user_id := null;   -- a changed email must sign in again as the new address
  end if;
  if new.user_id is null and new.email is not null then
    select u.id into new.user_id from auth.users u where lower(u.email) = new.email limit 1;
  end if;
  return new;
end $$;

create trigger staff_link_user
  before insert or update of email on public.staff
  for each row execute function public.link_staff_row();

-- There must always be at least one active owner, so the back office can't lock itself out.
create or replace function public.keep_an_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and old.active
     and not exists (select 1 from public.staff where role = 'owner' and active) then
    raise exception 'Thaanora needs at least one active owner';
  end if;
  return null;
end $$;

create trigger staff_keep_an_owner
  after update of role, active or delete on public.staff
  for each row execute function public.keep_an_owner();

-- ───────────────────── Policies by role ─────────────────────────
-- Catalogue: products, photos, stock
drop policy if exists "staff manage products" on public.products;
create policy "catalogue manages products" on public.products
  for all to authenticated
  using (public.has_staff_role('catalogue')) with check (public.has_staff_role('catalogue'));

drop policy if exists "staff read product images" on public.product_images;
drop policy if exists "owner manages product images" on public.product_images;
create policy "catalogue manages product images" on public.product_images
  for all to authenticated
  using (public.has_staff_role('catalogue')) with check (public.has_staff_role('catalogue'));

drop policy if exists "staff manage stock" on public.stock_movements;
create policy "catalogue manages stock" on public.stock_movements
  for all to authenticated
  using (public.has_staff_role('catalogue')) with check (public.has_staff_role('catalogue'));

drop policy if exists "owner lists product photos" on storage.objects;
drop policy if exists "owner uploads product photos" on storage.objects;
drop policy if exists "owner updates product photos" on storage.objects;
drop policy if exists "owner deletes product photos" on storage.objects;
create policy "catalogue lists product photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and public.has_staff_role('catalogue'));
create policy "catalogue uploads product photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and public.has_staff_role('catalogue'));
create policy "catalogue updates product photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-photos' and public.has_staff_role('catalogue'))
  with check (bucket_id = 'product-photos' and public.has_staff_role('catalogue'));
create policy "catalogue deletes product photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and public.has_staff_role('catalogue'));

-- Orders: orders, order lines, requests and their screenshots
drop policy if exists "staff manage orders" on public.orders;
create policy "orders team manages orders" on public.orders
  for all to authenticated
  using (public.has_staff_role('orders')) with check (public.has_staff_role('orders'));

drop policy if exists "staff manage order items" on public.order_items;
create policy "orders team manages order items" on public.order_items
  for all to authenticated
  using (public.has_staff_role('orders')) with check (public.has_staff_role('orders'));

-- The purchase cost on an order line is for the owner's reports only: signed-in users
-- can't read that column at all (reports will read it through an owner-only function).
revoke select on public.order_items from authenticated;
grant select (id, order_id, product_id, product_code, product_name, unit_price_sar, qty, wants_stitching, created_at)
  on public.order_items to authenticated;

drop policy if exists "staff manage requests" on public.requests;
create policy "orders team manages requests" on public.requests
  for all to authenticated
  using (public.has_staff_role('orders')) with check (public.has_staff_role('orders'));

drop policy if exists "staff read request screenshots" on storage.objects;
create policy "orders team reads request screenshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'request-screenshots' and public.has_staff_role('orders'));

-- Owner only: tailors, offers & codes, seasons & labels, settings, staff
drop policy if exists "staff manage tailors" on public.tailors;
create policy "owner manages tailors" on public.tailors
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "staff manage offers" on public.offers;
create policy "owner manages offers" on public.offers
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "staff manage campaigns" on public.campaigns;
create policy "owner manages campaigns" on public.campaigns
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- All staff may read the public settings (WhatsApp number, delivery fees); private ones stay owner-only.
drop policy if exists "staff read settings" on public.settings;
create policy "staff read public settings" on public.settings
  for select to authenticated using (is_public and public.is_staff());
-- "owner writes settings" (all commands, owner only) stays as it is.
-- "staff read own row" and "owner manages staff" on public.staff stay as they are.
