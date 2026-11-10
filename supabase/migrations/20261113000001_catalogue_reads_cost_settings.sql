-- The Products screen shows margin (selling price vs. PKR cost) and low-stock flags, so the
-- catalogue team may read the PKR rate and the low-stock level. Every other private setting stays owner-only.
create policy "catalogue reads cost settings" on public.settings
  for select to authenticated
  using (key in ('pkr_per_sar', 'low_stock_level') and public.has_staff_role('catalogue'));
