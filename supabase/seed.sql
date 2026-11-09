-- Seed data generated from docs/thaanora-website-prototype.html
-- Stock and prices are pilot examples. No brand photos are seeded (they need written permission).
begin;

insert into public.products (code, brand, name, fabric, work, collection, price_sar, sale_pct, cost_pkr, colour_family, colour_hex, accent_hex, is_new, trending_rank, occasions, source_url, sort_order) values
  ('U4094SU-3PC-582', 'Limelight', 'Embroidered Khaddar · Maroon', 'Khaddar', 'Embroidered', null, 179, 20, 5249, 'red', '#6B2430', '#E6CB8E', false, 3, array['Wedding', 'Anniversary']::text[], 'https://www.limelight.pk/products/u4094su-3pc-582', 10),
  ('U3PEST26V930', 'Sapphire', 'Embroidered Light Khaddar · Green', 'Light khaddar', 'Embroidered', null, 239, 0, 6990, 'green', '#2F4A2C', '#E6CB8E', true, 1, array['Eid', 'Gifts']::text[], 'https://pk.sapphireonline.pk/collections/unstitched/products/U3PEST26V930.html', 20),
  ('SP-62038', 'Gul Ahmed', 'Embroidered Raw Silk · Teal', 'Raw silk', 'Embroidered', 'Festive', 459, 0, 17490, 'blue', '#1E7FA6', '#E6CB8E', false, null, array['Wedding', 'Anniversary']::text[], 'https://www.gulahmedshop.com/products/3-piece-embroidered-raw-silk-suit-sp-62038', 30),
  ('BT22601UN004207', 'Beechtree', 'Serena Gold · Embroidered Jacquard', 'Yarn-dyed jacquard', 'Embroidered', null, 239, 0, 8990, 'neutral', '#D9CBB6', '#8A6A2E', true, null, array['Wedding', 'Eid']::text[], 'https://beechtree.pk/products/bt22601un004207-beige', 40),
  ('U4646SU-3PC-451', 'Limelight', 'Embroidered Khaddar · Coral', 'Khaddar', 'Embroidered', null, 149, 0, 3849, 'red', '#E07A63', '#FBF8F2', false, 2, array['Everyday', 'Birthday', 'Gifts']::text[], 'https://www.limelight.pk/products/u4646su-3pc-451', 50),
  ('EF437-3P26', 'Alkaram Studio', 'Embroidered Marina · Light Purple', 'Marina viscose', 'Embroidered', null, 239, 0, 6990, 'red', '#D7A2B8', '#FBF8F2', true, null, array['Birthday', 'Gifts']::text[], 'https://www.alkaramstudio.com/products/rts-shirt-trouser-dupatta-ef437-3p26-light-purple', 60),
  ('U4098SU-3PC-256', 'Limelight', 'Embroidered Karandi · Emerald', 'Karandi', 'Embroidered', null, 209, 0, 5949, 'green', '#1F5A4A', '#E6CB8E', false, 4, array['Eid']::text[], 'https://www.limelight.pk/products/u4098su-3pc-256', 70),
  ('BT22602UN004081', 'Beechtree', 'Royal Amber · Printed Khaddar', 'Khaddar', 'Printed', null, 179, 0, 4990, 'blue', '#23366B', '#E6CB8E', false, 5, array['Everyday']::text[], 'https://beechtree.pk/products/bt22602un004081-multi', 80),
  ('SP-62078', 'Gul Ahmed', 'Printed Pashmina · Ivory', 'Pashmina', 'Printed', null, 259, 0, 7490, 'earth', '#CDB592', '#5A3A26', true, null, array['Eid', 'Gifts']::text[], 'https://www.gulahmedshop.com/products/3-piece-printed-pashmina-suit-sp-62078', 90),
  ('EF441-3P26', 'Alkaram Studio', 'Embroidered Khaddar · Off White', 'Khaddar', 'Embroidered', null, 299, 0, 8590, 'neutral', '#DCE6DC', '#8A6A2E', false, null, array['Wedding', 'Eid']::text[], 'https://www.alkaramstudio.com/products/rts-shirt-trouser-dupatta-ef441-3p26-off-white', 100),
  ('U3PEST26V945', 'Sapphire', 'Embroidered Light Khaddar · Navy', 'Light khaddar', 'Embroidered', null, 229, 15, 6590, 'blue', '#26305A', '#E6CB8E', false, null, array['Eid', 'Anniversary']::text[], 'https://pk.sapphireonline.pk/collections/unstitched/products/U3PEST26V945.html', 110),
  ('EF445-3P26', 'Alkaram Studio', 'Embroidered Khaddar · Olive', 'Khaddar', 'Embroidered', null, 229, 0, 6490, 'green', '#8C8A5E', '#FBF8F2', false, 6, array['Everyday', 'Eid']::text[], 'https://www.alkaramstudio.com/products/rts-shirt-trouser-dupatta-ef445-3p26-green', 120),
  ('U4563SU-3PC-091', 'Limelight', 'Printed Khaddar · Olive Brown', 'Khaddar', 'Printed', null, 119, 15, 2939, 'earth', '#6F6436', '#E6CB8E', false, null, array['Everyday']::text[], 'https://www.limelight.pk/products/u4563su-3pc-091', 130),
  ('LT-62012', 'Gul Ahmed', 'Printed Linen · Forest', 'Linen', 'Printed', null, 189, 0, 5490, 'green', '#2F5A45', '#E6CB8E', false, null, array['Everyday', 'Birthday']::text[], 'https://www.gulahmedshop.com/products/3-piece-printed-linen-suit-lt-62012', 140),
  ('EC572-3P26B', 'Alkaram Studio', 'Printed Khaddar · Rose', 'Khaddar', 'Printed', null, 159, 0, 3990, 'red', '#7D4B4E', '#E6CB8E', false, null, array['Everyday', 'Birthday']::text[], 'https://www.alkaramstudio.com/products/rts-shirt-trouser-dupatta-ec572-3p26b-pink', 150),
  ('BT22601UN004198', 'Beechtree', 'Autumn Breeze · Printed Khaddar', 'Khaddar', 'Printed', null, 189, 0, 5290, 'blue', '#9FB7C3', '#5A3A26', false, null, array['Everyday', 'Gifts']::text[], 'https://beechtree.pk/products/bt22601un004198-multi', 160)
on conflict (code) do nothing;

-- Opening stock goes through stock_movements so the trigger sets products.stock
insert into public.stock_movements (product_id, delta, reason, note)
select p.id, v.qty, 'receive_shipment', 'Opening stock (pilot)'
from (values
  ('U4094SU-3PC-582', 4),
  ('U3PEST26V930', 5),
  ('SP-62038', 2),
  ('BT22601UN004207', 3),
  ('U4646SU-3PC-451', 6),
  ('EF437-3P26', 5),
  ('U4098SU-3PC-256', 3),
  ('BT22602UN004081', 6),
  ('SP-62078', 4),
  ('EF441-3P26', 4),
  ('U3PEST26V945', 5),
  ('EF445-3P26', 5),
  ('U4563SU-3PC-091', 6),
  ('LT-62012', 5),
  ('EC572-3P26B', 6)
) as v(code, qty) join public.products p on p.code = v.code;

insert into public.settings (key, value, is_public) values
  ('whatsapp_number', '"+966 5X XXX XXXX"'::jsonb, true),
  ('social_links', '{"instagram":"https://www.instagram.com/","tiktok":"https://www.tiktok.com/","snapchat":"https://www.snapchat.com/"}'::jsonb, true),
  ('delivery_fees', '[{"area":"Central Riyadh (Olaya, Malaz, Sulaimaniyah)","fee_sar":20},{"area":"North Riyadh (Narjis, Yasmin, Malqa)","fee_sar":25},{"area":"East Riyadh (Rawdah, Naseem, Qadisiyah)","fee_sar":25},{"area":"West Riyadh (Laban, Irqah, Dhahrat)","fee_sar":25},{"area":"South Riyadh (Shifa, Aziziyah, Dar Al Baida)","fee_sar":25},{"area":"Outskirts of Riyadh","fee_sar":35}]'::jsonb, true),
  ('business', '{"legal_name":"Desert Bloom Poultry Company","entity_type":"Limited liability company (one person)","national_number":"7054375741","vat_number":"","address":"Riyadh, Saudi Arabia"}'::jsonb, true),
  ('vat_rate_pct', '0'::jsonb, true),   -- not VAT-registered yet; set to 15 once registered
  ('gift_box_fee_sar', '15'::jsonb, true),
  ('pkr_per_sar', '73.73'::jsonb, false),
  ('low_stock_level', '3'::jsonb, false),
  ('tailor_member_discount_pct', '10'::jsonb, true)
on conflict (key) do nothing;

insert into public.offers (kind, code, percent, min_qty, active) values
  ('bundle', null, 10, 3, true),
  ('code', 'THAANORA10', 10, null, true)
on conflict do nothing;

insert into public.campaigns (kind, title, brand, sort_order) values
  ('brand_of_month', '{"en":"Brand of the month"}'::jsonb, 'Alkaram Studio', 0),
  ('topbar_message', '{"en":"New arrivals · 10% off this week","ar":"وصولات جديدة · خصم ١٠٪ هذا الأسبوع","ur":"نئی آمد · اس ہفتے ۱۰٪ رعایت","hi":"नई आमद · इस सप्ताह 10% छूट"}'::jsonb, null, 10);

insert into public.tailors (name, area, member_price_note, sort_order) values
  ('Partner tailor A · Olaya', 'Central Riyadh (Olaya, Malaz, Sulaimaniyah)', 'Member price for Thaanora customers', 10),
  ('Partner tailor B · Malaz', 'Central Riyadh (Olaya, Malaz, Sulaimaniyah)', 'Member price for Thaanora customers', 20),
  ('Partner tailor C · Yasmin', 'North Riyadh (Narjis, Yasmin, Malqa)', 'Member price for Thaanora customers', 30),
  ('Partner tailor D · Narjis', 'North Riyadh (Narjis, Yasmin, Malqa)', 'Member price for Thaanora customers', 40),
  ('Partner tailor E · Rawdah', 'East Riyadh (Rawdah, Naseem, Qadisiyah)', 'Member price for Thaanora customers', 50),
  ('Partner tailor F · Laban', 'West Riyadh (Laban, Irqah, Dhahrat)', 'Member price for Thaanora customers', 60),
  ('Partner tailor G · Aziziyah', 'South Riyadh (Shifa, Aziziyah, Dar Al Baida)', 'Member price for Thaanora customers', 70),
  ('Home pick-up by partner tailor A', 'Outskirts of Riyadh', 'Member price for Thaanora customers', 80);

commit;
