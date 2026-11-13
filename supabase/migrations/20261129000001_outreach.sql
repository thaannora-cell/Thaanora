-- Phase 3B · A10: announcements and targeted (personal) offers sent from the back office, plus a log.
-- Owner only. Each send creates in-site notifications (and WhatsApp-list items for customers who chose
-- that) through notify_customer; an offer send also creates one personal offer per customer.

create table if not exists public.outreach (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('announcement', 'offer')),
  segment        text not null check (segment in ('all', 'level', 'brand', 'inactive', 'birthday_month', 'customer')),
  segment_value  text check (segment_value is null or char_length(segment_value) <= 80),
  title          jsonb not null default '{}'::jsonb check (jsonb_typeof(title) = 'object' and pg_column_size(title) < 2000),
  body           jsonb not null default '{}'::jsonb check (jsonb_typeof(body) = 'object' and pg_column_size(body) < 6000),
  percent        numeric(5,2) check (percent is null or (percent > 0 and percent <= 50)),
  ends_at        timestamptz,
  recipients     integer not null default 0 check (recipients >= 0),
  created_by     uuid references auth.users (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  check ((kind = 'offer') = (percent is not null))
);
create index if not exists outreach_created_idx on public.outreach (created_at desc);
alter table public.outreach enable row level security;
revoke all on public.outreach from anon, authenticated;
grant select on public.outreach to authenticated;
drop policy if exists "owner reads outreach" on public.outreach;
create policy "owner reads outreach" on public.outreach
  for select to authenticated using (public.has_staff_role('owner'));
-- Written only by the server (secret key) after checking the owner's session.

alter table public.customer_offers add column if not exists outreach_id uuid references public.outreach (id) on delete set null;
create index if not exists customer_offers_outreach_idx on public.customer_offers (outreach_id) where outreach_id is not null;

-- Many notifications at once (server only): same type and facts for each customer.
create or replace function public.notify_many(p_customers uuid[], p_type text, p_data jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v uuid;
  n integer := 0;
begin
  foreach v in array coalesce(p_customers, '{}') loop
    perform public.notify_customer(v, p_type, p_data);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.notify_many(uuid[], text, jsonb) from public, anon, authenticated;
grant execute on function public.notify_many(uuid[], text, jsonb) to service_role;
