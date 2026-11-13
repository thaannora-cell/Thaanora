-- Phase 3B · A11 security check: views get read-only grants.
-- Supabase's default privileges give anon/authenticated every right on new objects in "public", views
-- included. These two views group rows (so they can't be written through anyway), but the grants should
-- say what we mean: read only, and customer figures for staff only.
revoke all on public.review_summary from anon, authenticated;
grant select on public.review_summary to anon, authenticated;

revoke all on public.customer_stats from anon, authenticated;
grant select on public.customer_stats to authenticated; -- rows come from RLS on customers/orders (staff)
