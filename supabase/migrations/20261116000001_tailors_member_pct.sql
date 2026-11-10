-- Each partner tailor can have their own member discount for Thaanora customers.
-- Empty means "use the shop-wide default" (setting tailor_member_discount_pct).
alter table public.tailors
  add column member_pct smallint check (member_pct is null or member_pct between 0 and 50);

-- The website may show it (the phone number stays staff-only).
grant select (member_pct) on public.tailors to anon;
