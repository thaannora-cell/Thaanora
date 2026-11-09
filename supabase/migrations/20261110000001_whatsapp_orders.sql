-- WhatsApp orders: atomic order creation for the server route, gift recipient fields,
-- and stock that moves only when staff confirm (and comes back if a confirmed order is cancelled or refused).

alter table public.orders
  add column recipient_name text,
  add column recipient_area text;

-- Called only by the server route (secret key) after it has validated and priced the order.
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns table (new_order_id uuid, new_order_no text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_no text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order has no items';
  end if;

  insert into public.orders (
    customer_name, customer_phone, language, area, packaging, is_gift, gift_note,
    recipient_name, recipient_area, discount_code,
    subtotal_sar, bundle_discount_sar, code_discount_sar, packaging_fee_sar, delivery_fee_sar, total_sar, vat_sar
  ) values (
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'language', p_order->>'area',
    (p_order->>'packaging')::public.packaging_type, coalesce((p_order->>'is_gift')::boolean, false), p_order->>'gift_note',
    p_order->>'recipient_name', p_order->>'recipient_area', p_order->>'discount_code',
    (p_order->>'subtotal_sar')::numeric, (p_order->>'bundle_discount_sar')::numeric, (p_order->>'code_discount_sar')::numeric,
    (p_order->>'packaging_fee_sar')::numeric, (p_order->>'delivery_fee_sar')::numeric,
    (p_order->>'total_sar')::numeric, (p_order->>'vat_sar')::numeric
  )
  returning id, order_no into v_id, v_no;

  insert into public.order_items (order_id, product_id, product_code, product_name, unit_price_sar, unit_cost_pkr, qty, wants_stitching)
  select v_id,
         (i->>'product_id')::uuid,
         i->>'product_code',
         i->>'product_name',
         (i->>'unit_price_sar')::numeric,
         nullif(i->>'unit_cost_pkr', '')::numeric,
         (i->>'qty')::integer,
         coalesce((i->>'wants_stitching')::boolean, false)
  from jsonb_array_elements(p_items) as i;

  if nullif(p_order->>'discount_code', '') is not null then
    update public.offers set used_count = used_count + 1
     where kind = 'code' and code = p_order->>'discount_code';
  end if;

  return query select v_id, v_no;
end $$;

revoke all on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;

-- Stock is held from "Confirmed" onwards. Moving into a held status takes stock off;
-- moving from a held status to Cancelled / Refused at door puts it back.
-- If there isn't enough stock, the stock check fails and the status change is rejected.
create or replace function public.order_stock_on_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  held constant public.order_status[] := array['confirmed', 'packed', 'with_courier', 'delivered_cash_collected']::public.order_status[];
  was_held boolean := old.status = any (held);
  is_held boolean := new.status = any (held);
begin
  if is_held and not was_held then
    insert into public.stock_movements (product_id, delta, reason, order_id, note, created_by)
    select oi.product_id, -oi.qty, 'sale', new.id, new.order_no, (select auth.uid())
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id is not null;
  elsif was_held and not is_held then
    insert into public.stock_movements (product_id, delta, reason, order_id, note, created_by)
    select oi.product_id, oi.qty,
           case when new.status = 'refused_at_door' then 'refused_at_door'::public.stock_reason else 'return'::public.stock_reason end,
           new.id, new.order_no, (select auth.uid())
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id is not null;
  end if;
  return new;
end $$;

create trigger orders_stock_on_status
  after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.order_stock_on_status();
