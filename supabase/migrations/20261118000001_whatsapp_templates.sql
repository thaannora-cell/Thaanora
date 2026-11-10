-- Step 33: WhatsApp message templates, edited by the owner in Settings (settings key 'whatsapp_templates',
-- private, so the website never reads it). The orders team sends these messages, so it may read them too.
-- The owner already reads and writes every setting ("owner writes settings").
drop policy if exists "orders team reads message templates" on public.settings;
create policy "orders team reads message templates" on public.settings
  for select to authenticated
  using (key = 'whatsapp_templates' and public.has_staff_role('orders'));
