-- Thaanora initial schema
-- Rules: prices in SAR (VAT-inclusive), purchase cost in PKR and never readable by the public,
-- RLS on every table, website writes go through server routes (service role), not the browser.

-- ───────────────────────────── Types ─────────────────────────────
create type public.staff_role     as enum ('owner', 'staff');
create type public.order_status   as enum ('waiting_confirmation', 'confirmed', 'packed', 'with_courier', 'delivered_cash_collected', 'refused_at_door', 'cancelled');
create type public.packaging_type as enum ('suit_keeper_bag', 'gift_box');
create type public.stock_reason   as enum ('receive_shipment', 'sale', 'adjustment', 'return', 'refused_at_door', 'damaged');
create type public.request_type   as enum ('sourcing', 'notify_me', 'preorder', 'stitching');
create type public.request_status as enum ('new', 'in_progress', 'done', 'closed');
create type public.offer_kind     as enum ('code', 'bundle');
create type public.campaign_kind  as enum ('campaign', 'brand_of_month', 'topbar_message');

-- ─────────────────────────── Helpers ────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ──────────────────────────── Staff ─────────────────────────────
-- Staff are added by phone; user_id is linked automatically on their first phone sign-in.
create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete set null,
  name        text not null,
  phone       text not null unique check (phone ~ '^\+[0-9]{8,15}$'),
  role        public.staff_role not null default 'staff',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.active
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.active and s.role = 'owner'
  );
$$;

create or replace function public.link_staff_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.phone is not null then
    update public.staff
       set user_id = new.id
     where user_id is null
       and regexp_replace(phone, '\D', '', 'g') = regexp_replace(new.phone, '\D', '', 'g');
  end if;
  return new;
end $$;

create trigger on_auth_user_created_link_staff
  after insert or update of phone on auth.users
  for each row execute function public.link_staff_user();

-- ─────────────────────────── Products ───────────────────────────
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,                 -- brand article code, printed on every suit
  brand          text not null,
  name           text not null,
  fabric         text not null,
  work           text not null check (work in ('Embroidered', 'Printed')),
  collection     text,
  price_sar      numeric(10,2) not null check (price_sar >= 0),       -- VAT-inclusive
  sale_pct       smallint not null default 0 check (sale_pct between 0 and 90),
  cost_pkr       numeric(12,2) check (cost_pkr >= 0),                   -- staff only
  colour_family  text not null check (colour_family in ('red', 'earth', 'green', 'blue', 'purple', 'neutral')),
  colour_hex     text not null check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  accent_hex     text not null check (accent_hex ~ '^#[0-9A-Fa-f]{6}$'),
  shirt_m        numeric(3,1) not null default 3.0,
  dupatta_m      numeric(3,1) not null default 2.5,
  trouser_m      numeric(3,1) not null default 2.5,
  stock          integer not null default 0 check (stock >= 0),       -- maintained by stock_movements
  is_new         boolean not null default false,
  trending_rank  smallint check (trending_rank > 0),
  occasions      text[] not null default '{}'
                 check (occasions <@ array['Everyday','Eid','Wedding','Birthday','Anniversary','Gifts']),
  source_url     text,
  visible        boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index products_visible_sort_idx on public.products (visible, sort_order);
create index products_occasions_idx on public.products using gin (occasions);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  storage_path  text not null,          -- path inside the product-images bucket
  alt           text,
  is_model      boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ─────────────────────────── Stock ──────────────────────────────
create table public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  delta       integer not null check (delta <> 0),
  reason      public.stock_reason not null,
  order_id    uuid,                     -- fk added after orders exists
  note        text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.products set stock = stock + new.delta where id = new.product_id;
  return new;
end $$;

create trigger stock_movements_apply after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- ─────────────────────────── Orders ─────────────────────────────
create sequence public.order_number_seq start 1001;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_no           text not null unique default ('TH-' || nextval('public.order_number_seq')),
  status             public.order_status not null default 'waiting_confirmation',
  customer_name      text not null,
  customer_phone     text not null,
  language           text not null default 'en' check (language in ('en', 'ar', 'ur', 'hi')),
  area               text not null,
  address            text,
  packaging          public.packaging_type not null default 'suit_keeper_bag',
  is_gift            boolean not null default false,
  gift_note          text,
  discount_code      text,
  subtotal_sar       numeric(10,2) not null check (subtotal_sar >= 0),
  bundle_discount_sar numeric(10,2) not null default 0,
  code_discount_sar  numeric(10,2) not null default 0,
  packaging_fee_sar  numeric(10,2) not null default 0,
  delivery_fee_sar   numeric(10,2) not null default 0,
  total_sar          numeric(10,2) not null check (total_sar >= 0),   -- VAT-inclusive, paid in cash
  vat_sar            numeric(10,2) not null default 0,               -- VAT portion of total, for invoices
  courier            text,
  tracking_no        text,
  notes              text,
  status_changed_at  timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_phone_idx on public.orders (customer_phone);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create or replace function public.touch_order_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end $$;
create trigger orders_status_changed before update of status on public.orders
  for each row execute function public.touch_order_status();

alter table public.stock_movements
  add constraint stock_movements_order_fk foreign key (order_id) references public.orders (id) on delete set null;

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  product_code    text not null,          -- snapshot at time of order
  product_name    text not null,
  unit_price_sar  numeric(10,2) not null check (unit_price_sar >= 0),
  unit_cost_pkr   numeric(12,2),          -- snapshot for margin reports
  qty             integer not null check (qty > 0),
  wants_stitching boolean not null default false,
  created_at      timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

-- ────────────────────────── Requests ────────────────────────────
create table public.requests (
  id              uuid primary key default gen_random_uuid(),
  type            public.request_type not null,
  status          public.request_status not null default 'new',
  product_id      uuid references public.products (id) on delete set null,
  customer_name   text,
  customer_phone  text not null,
  area            text,
  details         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index requests_status_idx on public.requests (status, created_at desc);
create trigger requests_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

-- ─────────────────────────── Tailors ────────────────────────────
create table public.tailors (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  area               text not null,
  phone              text,                 -- staff only
  member_price_note  text,
  visible            boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger tailors_updated_at before update on public.tailors
  for each row execute function public.set_updated_at();

-- ──────────────────── Offers (codes + bundle rule) ───────────────
create table public.offers (
  id           uuid primary key default gen_random_uuid(),
  kind         public.offer_kind not null,
  code         text unique check (code is null or code = upper(code)),
  percent      smallint not null check (percent between 1 and 90),
  min_qty      smallint check (min_qty > 0),
  active       boolean not null default true,
  starts_at    timestamptz,
  ends_at      timestamptz,
  usage_limit  integer check (usage_limit > 0),
  used_count   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((kind = 'code' and code is not null) or (kind = 'bundle' and code is null and min_qty is not null))
);
create unique index offers_one_active_bundle on public.offers (kind) where kind = 'bundle' and active;
create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- ─────────────── Campaigns (seasons, labels, top bar) ────────────
create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  kind        public.campaign_kind not null,
  title       jsonb not null default '{}'::jsonb,   -- { "en": "...", "ar": "...", "ur": "...", "hi": "..." }
  brand       text,                                  -- for brand_of_month
  occasion    text,                                  -- e.g. Eid, links a campaign to an occasion chip
  active      boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ─────────────────────────── Settings ───────────────────────────
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ─────────────────────── Row Level Security ─────────────────────
alter table public.staff           enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
alter table public.stock_movements enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.requests        enable row level security;
alter table public.tailors         enable row level security;
alter table public.offers          enable row level security;
alter table public.campaigns       enable row level security;
alter table public.settings        enable row level security;

-- The public (anon) role never writes; website writes go through server routes.
revoke insert, update, delete, truncate on all tables in schema public from anon;

-- Column-level grants: the public can only read safe columns (no cost, no phone numbers, no codes).
revoke select on public.products from anon;
grant select (id, code, brand, name, fabric, work, collection, price_sar, sale_pct,
              colour_family, colour_hex, accent_hex, shirt_m, dupatta_m, trouser_m, stock,
              is_new, trending_rank, occasions, visible, sort_order)
  on public.products to anon;

revoke select on public.tailors from anon;
grant select (id, name, area, member_price_note, sort_order) on public.tailors to anon;

revoke select on public.offers from anon;
grant select (id, kind, percent, min_qty, active, starts_at, ends_at) on public.offers to anon;

revoke select on public.settings from anon;
grant select (key, value) on public.settings to anon;

-- Public read policies
create policy "public reads visible products" on public.products
  for select to anon using (visible);

create policy "public reads images of visible products" on public.product_images
  for select to anon using (exists (
    select 1 from public.products p where p.id = product_id and p.visible
  ));

create policy "public reads visible tailors" on public.tailors
  for select to anon using (visible);

create policy "public reads active bundle rule" on public.offers
  for select to anon using (
    kind = 'bundle' and active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "public reads live campaigns" on public.campaigns
  for select to anon using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "public reads public settings" on public.settings
  for select to anon using (is_public);

-- Staff policies (signed-in owner/staff only)
create policy "staff manage products"        on public.products        for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage product images"  on public.product_images  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage stock"           on public.stock_movements for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage orders"          on public.orders          for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage order items"     on public.order_items     for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage requests"        on public.requests        for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage tailors"         on public.tailors         for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage offers"          on public.offers          for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage campaigns"       on public.campaigns       for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff read settings"   on public.settings for select to authenticated using (public.is_staff());
create policy "owner writes settings" on public.settings for all    to authenticated using (public.is_owner()) with check (public.is_owner());

create policy "staff read own row"    on public.staff for select to authenticated using (user_id = (select auth.uid()) or public.is_owner());
create policy "owner manages staff"   on public.staff for all    to authenticated using (public.is_owner()) with check (public.is_owner());

-- ───────────────────── Storage: product photos ──────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "staff upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_staff());
create policy "staff update product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_staff());
create policy "staff delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_staff());
