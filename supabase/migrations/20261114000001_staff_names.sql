-- Stock history shows who made each change. Staff can otherwise only read their own staff row,
-- so this returns just the sign-in id and display name of every staff member, to signed-in staff only.
-- No emails, phones or roles are exposed.
create or replace function public.staff_names()
returns table (user_id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select s.user_id, s.name
    from public.staff s
   where s.user_id is not null
     and public.is_staff();
$$;

revoke all on function public.staff_names() from public, anon;
grant execute on function public.staff_names() to authenticated;
