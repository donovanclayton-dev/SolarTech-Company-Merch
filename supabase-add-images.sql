-- Run this in the Supabase SQL Editor after creating the "item-images" bucket
-- (Storage -> New bucket -> name it exactly "item-images" -> toggle "Public bucket" ON -> Create).
-- Safe to re-run even if you already ran an earlier version of this file.

create table if not exists product_images (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  name        text not null,
  path        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table product_images enable row level security;

drop policy if exists "product_images_select_public" on product_images;
drop policy if exists "product_images_insert_admin" on product_images;
drop policy if exists "product_images_delete_admin" on product_images;

create policy "product_images_select_public" on product_images
  for select using (true);

create policy "product_images_insert_admin" on product_images
  for insert with check (auth.role() = 'authenticated');

create policy "product_images_delete_admin" on product_images
  for delete using (auth.role() = 'authenticated');

-- Storage bucket policies: anyone can view photos, only the signed-in admin can upload/remove.
drop policy if exists "item_images_select_public" on storage.objects;
drop policy if exists "item_images_insert_admin" on storage.objects;
drop policy if exists "item_images_update_admin" on storage.objects;
drop policy if exists "item_images_delete_admin" on storage.objects;

create policy "item_images_select_public" on storage.objects
  for select using (bucket_id = 'item-images');

create policy "item_images_insert_admin" on storage.objects
  for insert with check (bucket_id = 'item-images' and auth.role() = 'authenticated');

create policy "item_images_delete_admin" on storage.objects
  for delete using (bucket_id = 'item-images' and auth.role() = 'authenticated');
