-- Phase 3B · A6: "Trending in Riyadh this week" and "Thaanora recommends" (Our picks + For you).

-- Anonymous counts for trending: a suit opened ("view") or added to the selection ("add").
-- No person, no cookie, no address: just which suit and when. Written only by the server route
-- (rate-limited); nobody reads the rows directly. Rows older than 30 days are deleted daily.
create table if not exists public.product_events (
  id          bigint generated always as identity primary key,
  product_id  uuid not null references public.products (id) on delete cascade,
  kind        text not null check (kind in ('view', 'add')),
  created_at  timestamptz not null default now()
);
create index if not exists product_events_recent_idx on public.product_events (created_at, product_id);
alter table public.product_events enable row level security;
revoke all on public.product_events from anon, authenticated;

-- Our picks: suits the owner recommends, with a short note in each language.
alter table public.products
  add column if not exists is_pick   boolean not null default false,
  add column if not exists pick_note jsonb   not null default '{}'::jsonb
    check (jsonb_typeof(pick_note) = 'object' and pg_column_size(pick_note) < 3000);
grant select (is_pick, pick_note) on public.products to anon;

-- Trending score per suit over the last p_days: units ordered ×3 (orders that weren't cancelled or
-- refused), added to selection ×2, opened ×1. Server only.
create or replace function public.trending_scores(p_days integer default 7)
returns table (product_id uuid, score numeric)
language sql stable security definer set search_path = '' as $$
  with since as (select now() - make_interval(days => greatest(1, least(p_days, 60))) as t),
  ordered as (
    select oi.product_id, sum(oi.qty) * 3 as pts
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.created_at >= (select t from since)
      and o.status not in ('cancelled', 'refused_at_door')
      and oi.product_id is not null
    group by oi.product_id
  ),
  events as (
    select e.product_id, sum(case when e.kind = 'add' then 2 else 1 end) as pts
    from public.product_events e
    where e.created_at >= (select t from since)
    group by e.product_id
  )
  select p.id, coalesce(o.pts, 0) + coalesce(e.pts, 0)
  from public.products p
  left join ordered o on o.product_id = p.id
  left join events e on e.product_id = p.id
  where p.visible and (o.pts is not null or e.pts is not null)
$$;
revoke execute on function public.trending_scores(integer) from public, anon, authenticated;
grant execute on function public.trending_scores(integer) to service_role;
