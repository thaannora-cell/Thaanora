-- Offers & codes and Seasons & labels.

-- A short note on each discount code ("Eid campaign", "Influencer Sara").
alter table public.offers
  add column note text check (note is null or char_length(note) <= 80);

-- Campaigns can carry a discount: on every suit, or only on suits tagged with one occasion.
-- They switch on and off by their dates (the website only reads live rows, see "public reads live campaigns").
alter table public.campaigns
  add column percent smallint not null default 0 check (percent between 0 and 90),
  add constraint campaigns_occasion_check
    check (occasion is null or occasion in ('Everyday', 'Eid', 'Wedding', 'Birthday', 'Anniversary', 'Gifts')),
  add constraint campaigns_dates_check
    check (starts_at is null or ends_at is null or ends_at > starts_at);

-- ───────────── Rate limiting for the website's server routes ─────────────
-- One row per (purpose, hashed visitor). Nobody can read or write it except through the function below,
-- which only the server's secret key may call.
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one attempt and says whether it is allowed (true) or over the limit (false).
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  -- Tidy up now and then: rows older than a day are no longer needed.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end $$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
