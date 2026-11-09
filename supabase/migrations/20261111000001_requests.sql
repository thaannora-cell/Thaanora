-- Sourcing requests: what the customer is looking for, and a private screenshot only staff can see.

alter table public.requests
  add column brand text,
  add column reference text,        -- link or product code, exactly as the customer typed it (untrusted)
  add column quantity smallint check (quantity between 1 and 50),
  add column screenshot_path text,  -- inside the private request-screenshots bucket
  add column language text check (language in ('en', 'ar', 'ur', 'hi'));

-- Private: no public URL. The server route uploads with the secret key; staff read when signed in.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-screenshots', 'request-screenshots', false, 4194304,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "staff read request screenshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'request-screenshots' and public.is_staff());

create policy "owner deletes request screenshots" on storage.objects
  for delete to authenticated
  using (bucket_id = 'request-screenshots' and public.is_owner());
