-- Step 35: invoices in Zoho Books. When an order is "Delivered · cash collected" the server creates a
-- simplified tax invoice in Zoho Books and saves its number and link here.
alter table public.orders
  add column if not exists invoice_status   text not null default 'none'
    check (invoice_status in ('none', 'pending', 'issued', 'failed')),
  add column if not exists invoice_no       text,          -- Zoho's invoice number, e.g. INV-000012
  add column if not exists invoice_zoho_id  text,          -- Zoho's internal id (for the PDF and retries)
  add column if not exists invoice_url      text,          -- Zoho's shareable invoice link
  add column if not exists invoice_paid     boolean not null default false, -- cash payment recorded in Zoho
  add column if not exists invoice_attempts integer not null default 0,
  add column if not exists invoice_error    text,
  add column if not exists invoice_tried_at timestamptz;

create index if not exists orders_invoice_attention_idx on public.orders (invoice_status)
  where invoice_status in ('none', 'pending', 'failed') and status = 'delivered_cash_collected';

-- Staff change only an order's status and delivery details from the back office. Totals, customer
-- details and the invoice fields are written by the server (secret key) only.
revoke update on public.orders from authenticated;
grant update (status, courier, tracking_no, notes) on public.orders to authenticated;

-- Which Zoho Books customer belongs to which phone number (server only; no policies = no access).
create table if not exists public.zoho_contacts (
  phone      text primary key,
  contact_id text not null,
  created_at timestamptz not null default now()
);
alter table public.zoho_contacts enable row level security;
revoke all on public.zoho_contacts from anon, authenticated;
