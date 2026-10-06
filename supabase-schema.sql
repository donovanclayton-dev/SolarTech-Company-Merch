-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sku         text,
  category    text,
  quantity    integer not null default 0,
  unit        text not null default 'unit',
  notes       text,
  updated_at  timestamptz not null default now()
);

create table if not exists requests (
  id                uuid primary key default gen_random_uuid(),
  item_id           uuid references items(id) on delete set null,
  item_name         text not null,
  requested_by      text not null,
  quantity_requested integer not null check (quantity_requested > 0),
  note              text,
  status            text not null default 'pending' check (status in ('pending', 'fulfilled', 'rejected')),
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

alter table items enable row level security;
alter table requests enable row level security;

-- Anyone (no login) can view the catalog.
create policy "items_select_public" on items
  for select using (true);

-- Only the logged-in admin can add/edit/remove items.
create policy "items_insert_admin" on items
  for insert with check (auth.role() = 'authenticated');

create policy "items_update_admin" on items
  for update using (auth.role() = 'authenticated');

create policy "items_delete_admin" on items
  for delete using (auth.role() = 'authenticated');

-- Anyone (no login) can submit a request.
create policy "requests_insert_public" on requests
  for insert with check (true);

-- Only the logged-in admin can see/manage the request queue.
create policy "requests_select_admin" on requests
  for select using (auth.role() = 'authenticated');

create policy "requests_update_admin" on requests
  for update using (auth.role() = 'authenticated');

-- Atomically mark a request fulfilled and decrement stock together,
-- so a half-applied update can't leave stock and request status out of sync.
create or replace function fulfill_request(req_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r requests%rowtype;
begin
  select * into r from requests where id = req_id and status = 'pending';

  if r.id is null then
    raise exception 'Request not found or already resolved';
  end if;

  update items
    set quantity = greatest(quantity - r.quantity_requested, 0),
        updated_at = now()
    where id = r.item_id;

  update requests
    set status = 'fulfilled',
        resolved_at = now()
    where id = r.id;
end;
$$;

revoke all on function fulfill_request(uuid) from public;
grant execute on function fulfill_request(uuid) to authenticated;

-- A few starter rows -- edit or delete these from the admin page.
insert into items (name, sku, category, quantity, unit) values
  ('SolarTech T-Shirt (L)', 'SWAG-TS-L', 'Apparel', 20, 'unit'),
  ('SolarTech Hard Hat', 'SAFE-HH-01', 'Safety Gear', 8, 'unit'),
  ('Demo Solar Panel (small)', 'DEMO-PNL-01', 'Sales Demo', 3, 'unit');
