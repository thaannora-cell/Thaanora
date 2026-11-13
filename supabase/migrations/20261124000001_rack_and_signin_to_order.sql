-- Phase 3B · A5b: shop layout and sign-in before ordering.

-- Where a suit shows on the website: on the rack at the top (on_rack, at most 17) or in the
-- collection grid below (everything else). If no suit is marked, the website puts the first 17
-- (product order) on the rack, so the shop never looks empty.
alter table public.products add column if not exists on_rack boolean not null default false;
grant select (on_rack) on public.products to anon;

create or replace function public.check_rack_size()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.on_rack and (tg_op = 'INSERT' or not old.on_rack) then
    if (select count(*) from public.products where on_rack and id <> new.id) >= 17 then
      raise exception 'rack_full' using errcode = 'P0001', hint = 'The rack holds 17 suits. Move one to the collection first.';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.check_rack_size() from public, anon, authenticated;
drop trigger if exists products_rack_size on public.products;
create trigger products_rack_size before insert or update of on_rack on public.products
  for each row execute function public.check_rack_size();

-- Ask customers to sign in before "Order on WhatsApp". Off until SMS sign-in (Taqnyat) is live.
-- Public, so the website can read it.
insert into public.settings (key, value, is_public)
values ('require_signin_to_order', 'false'::jsonb, true)
on conflict (key) do nothing;
