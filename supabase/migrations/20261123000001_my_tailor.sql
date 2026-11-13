-- Phase 3B · A5: "My tailor". The tailor network is a reference list: customers go to the tailor
-- themselves (Thaanora isn't involved in the stitching). Her account keeps the tailor she chose and her
-- measurements (inches), so she has them on every device and can send them to the tailor.
alter table public.customers
  add column if not exists tailor_id    uuid references public.tailors (id) on delete set null,
  add column if not exists measurements jsonb not null default '{}'::jsonb
    check (jsonb_typeof(measurements) = 'object' and pg_column_size(measurements) < 2000);

-- Nothing else changes: customers still read only their own profile, and only the server (after
-- checking the session) writes it. Tailor phone numbers stay hidden from website visitors; the server
-- shows a tailor's WhatsApp only to signed-in customers on My tailor.
