-- Product photos: public-read bucket, only the owner can upload, change or delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Retire the staff-upload policies of the earlier "product-images" bucket (it stays empty; delete it in the dashboard if you like).
drop policy if exists "staff upload product images" on storage.objects;
drop policy if exists "staff update product images" on storage.objects;
drop policy if exists "staff delete product images" on storage.objects;

-- Public bucket: anyone can open a photo by its URL, but only the owner can list it (also needed to replace a photo).
create policy "owner lists product photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());
create policy "owner uploads product photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and public.is_owner());
create policy "owner updates product photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-photos' and public.is_owner())
  with check (bucket_id = 'product-photos' and public.is_owner());
create policy "owner deletes product photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());

-- product_images: path is inside product-photos; size stored so pages can reserve space before the photo loads.
alter table public.product_images
  add column width  integer check (width > 0),
  add column height integer check (height > 0),
  add constraint product_images_storage_path_key unique (storage_path);

drop policy "staff manage product images" on public.product_images;
create policy "staff read product images" on public.product_images
  for select to authenticated using (public.is_staff());
create policy "owner manages product images" on public.product_images
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
