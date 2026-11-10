-- Security check (Step 32): tidy-up of function permissions.
-- These run only as triggers, with the owner's rights. Nobody needs to call them directly, so the
-- general "anyone may execute" right is removed. Triggers keep firing exactly as before.
revoke execute on function public.apply_stock_movement()  from public, anon, authenticated;
revoke execute on function public.order_stock_on_status() from public, anon, authenticated;
revoke execute on function public.keep_an_owner()         from public, anon, authenticated;
revoke execute on function public.link_staff_row()        from public, anon, authenticated;
revoke execute on function public.link_staff_user()       from public, anon, authenticated;

-- Visitors have no use for the staff checks (they always answer "no" for them); signed-in users keep
-- them because the Row Level Security policies call them.
revoke execute on function public.is_staff()                from public, anon;
revoke execute on function public.is_owner()                from public, anon;
revoke execute on function public.has_staff_role(text[])    from public, anon;
grant  execute on function public.is_staff()                to authenticated;
grant  execute on function public.is_owner()                to authenticated;
grant  execute on function public.has_staff_role(text[])    to authenticated;
