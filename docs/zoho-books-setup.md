# Zoho Books setup (Step 35: VAT invoices)

When an order is set to **Delivered · cash collected**, the back office creates a simplified tax invoice in
Zoho Books, marks it sent and records the cash payment. The invoice number and links are saved on the order
("View invoice"). If Zoho can't be reached, the order shows under **Needs attention** on the Dashboard, with a
**Retry** button on the order, and it is retried automatically every morning (06:00 Riyadh).

## 1. Zoho Books
1. Sign up at **books.zoho.sa** (Saudi edition) for the company *Desert Bloom Poultry Company*.
2. **Settings → Taxes**: make sure a **15% VAT** tax exists (the Saudi edition usually has it).
3. **Settings → Organisation profile**: copy the **Organisation ID**.
4. Note the invoice template shows the seller's VAT number. See "Before going live" below.

## 2. API keys (Self Client)
1. Open the API Console (**api-console.zoho.com**, or .sa if your Zoho account was created on zoho.sa) → *Add client* → **Self Client** → copy the **Client ID** and **Client Secret**.
2. *Generate Code* tab, scope:
   `ZohoBooks.invoices.ALL,ZohoBooks.contacts.ALL,ZohoBooks.customerpayments.CREATE,ZohoBooks.settings.READ`
   duration 10 minutes, description "Thaanora website" → **Create** → copy the code.
3. Swap the code for a refresh token (within 10 minutes), in a terminal:
   ```
   npm run zoho:token -- CODE
   ```
   This saves `ZOHO_REFRESH_TOKEN` in `.env.local`. It doesn't expire unless you revoke it.
   `invalid_client` means ZOHO_DC is the wrong region: Thaanora's account is on **com**.

## 3. Where the keys go (never in Git)
Locally in `.env.local`, and in **Vercel → Project → Settings → Environment Variables** (Production):

| Name | Value |
|---|---|
| `ZOHO_CLIENT_ID` | Client ID |
| `ZOHO_CLIENT_SECRET` | Client Secret |
| `ZOHO_REFRESH_TOKEN` | refresh token |
| `ZOHO_ORG_ID` | Organisation ID |
| `ZOHO_DC` | `com` (Thaanora's account region) |
| `CRON_SECRET` | any long random text (for the daily retry) |

Redeploy after adding them. Then, on any delivered order without an invoice, press **Create invoice**.

## What the invoice contains
- Customer: name and mobile (one Zoho customer per phone number).
- One line per suit at the website price (VAT included), plus Gift box and Delivery lines.
- Bundle and code discounts shared across the suit lines, so the invoice total equals the cash collected.
  The server checks this and refuses to continue if Zoho's total differs.
- Reference = order number; note "Cash on delivery"; payment recorded as cash.

## Before going live (owner decisions)
- **VAT registration.** Only a VAT-registered business may charge VAT and issue *tax* invoices in Saudi Arabia.
  If the company isn't registered yet, either register, or change the `vat_rate_pct` setting to 0 (the website
  then stops saying "incl. VAT" and invoices are issued without VAT). Ask your accountant.
- **ZATCA e-invoicing (Fatoora).** Registered businesses must also connect Zoho Books to ZATCA (Phase 2).
  Check that your Zoho Books plan includes it.
- **Free plan limits.** Check Zoho's current free-plan limits (invoices per year, API calls per day).
