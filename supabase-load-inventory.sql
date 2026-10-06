-- Run this in the Supabase SQL Editor (New query), after supabase-schema.sql.
-- Adds size tracking, removes the 3 sample items, and loads your real stock counts.

alter table items add column if not exists size text;
alter table requests add column if not exists size text;

delete from items where sku in ('SWAG-TS-L', 'SAFE-HH-01', 'DEMO-PNL-01');

insert into items (name, category, size, quantity, unit) values
  ('Windbreaker', 'Outerwear', 'XL', 2, 'unit'),

  ('Black Shirt, With Pocket', 'Shirts', '3XL', 1, 'unit'),
  ('Dark Grey Shirt, With Pocket', 'Shirts', 'XXL', 1, 'unit'),
  ('Dark Grey Shirt, With Pocket', 'Shirts', '3XL', 1, 'unit'),
  ('Black Shirt, No Pocket', 'Shirts', 'S', 1, 'unit'),
  ('Black Shirt, No Pocket', 'Shirts', 'M', 2, 'unit'),
  ('Black Shirt, No Pocket', 'Shirts', 'XXL', 1, 'unit'),
  ('Black Shirt, No Pocket', 'Shirts', '3XL', 2, 'unit'),
  ('Light Grey Shirt, No Pocket', 'Shirts', 'S', 1, 'unit'),
  ('Light Grey Shirt, No Pocket', 'Shirts', 'M', 1, 'unit'),
  ('Light Grey Shirt, No Pocket', 'Shirts', 'L', 1, 'unit'),
  ('Light Grey Shirt, No Pocket', 'Shirts', 'XXL', 2, 'unit'),
  ('Light Grey Shirt, No Pocket', 'Shirts', '3XL', 2, 'unit'),
  ('Dark Grey Shirt, No Pocket', 'Shirts', 'M', 6, 'unit'),
  ('Dark Grey Shirt, No Pocket', 'Shirts', 'L', 2, 'unit'),
  ('Dark Grey Shirt, No Pocket', 'Shirts', 'XL', 1, 'unit'),
  ('Dark Grey Shirt, No Pocket', 'Shirts', '3XL', 2, 'unit'),
  ('Light Grey Shirt, With Pocket', 'Shirts', '3XL', 1, 'unit'),
  ('Black Big Logo Shirt', 'Shirts', 'XXL', 1, 'unit'),

  ('White Men''s Polo', 'Polos (Men''s)', 'XXL', 1, 'unit'),
  ('Black Men''s Polo', 'Polos (Men''s)', 'XXL', 1, 'unit'),
  ('Dark Navy Men''s Polo', 'Polos (Men''s)', 'XXL', 1, 'unit'),
  ('Blue Men''s Polo', 'Polos (Men''s)', '3XL', 1, 'unit'),

  ('White Women''s Polo', 'Polos (Women''s)', 'S', 1, 'unit'),
  ('White Women''s Polo', 'Polos (Women''s)', 'L', 1, 'unit'),
  ('White Women''s Polo', 'Polos (Women''s)', 'XL', 1, 'unit'),
  ('Dark Navy Women''s Polo', 'Polos (Women''s)', 'XL', 1, 'unit'),
  ('Blue Women''s Polo', 'Polos (Women''s)', 'S', 1, 'unit'),
  ('Blue Women''s Polo', 'Polos (Women''s)', 'XL', 3, 'unit'),
  ('Blue Women''s Polo', 'Polos (Women''s)', 'XXL', 1, 'unit'),
  ('Black Women''s Polo', 'Polos (Women''s)', 'S', 2, 'unit'),
  ('Black Women''s Polo', 'Polos (Women''s)', 'XL', 2, 'unit'),
  ('Black Women''s Polo', 'Polos (Women''s)', '3XL', 2, 'unit'),

  ('Grey Tank Top', 'Tank Tops', 'XL', 3, 'unit'),
  ('Grey Tank Top', 'Tank Tops', 'XXL', 3, 'unit'),
  ('Dark Grey Tank Top', 'Tank Tops', 'S', 2, 'unit'),
  ('Dark Grey Tank Top', 'Tank Tops', 'M', 1, 'unit'),
  ('Dark Grey Tank Top', 'Tank Tops', 'XXL', 3, 'unit'),
  ('Dark Navy Tank Top', 'Tank Tops', 'S', 1, 'unit'),
  ('Dark Navy Tank Top', 'Tank Tops', 'XL', 2, 'unit'),
  ('Dark Navy Tank Top', 'Tank Tops', '3XL', 15, 'unit'),
  ('Black Tank Top', 'Tank Tops', 'S', 1, 'unit'),
  ('Black Tank Top', 'Tank Tops', 'M', 2, 'unit'),
  ('Black Tank Top', 'Tank Tops', 'L', 3, 'unit'),
  ('Black Tank Top', 'Tank Tops', 'XL', 8, 'unit'),
  ('Black Tank Top', 'Tank Tops', '3XL', 6, 'unit'),
  ('Light Blue Tank Top', 'Tank Tops', 'L', 3, 'unit'),
  ('Light Blue Tank Top', 'Tank Tops', 'XXL', 2, 'unit'),

  ('Black Hat', 'Hats', null, 5, 'unit'),
  ('Navy Hat', 'Hats', null, 5, 'unit'),
  ('Employee White Hat', 'Hats', null, 5, 'unit');
