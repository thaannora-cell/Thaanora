# Security check — Step 32 (10 Nov 2026)

## What was checked

| Area | How | Result |
|---|---|---|
| Row Level Security on every table | Test database with every migration; live database probed with the public (anon) key | ✅ All 12 tables have RLS. Visitors read 0 rows of orders, order lines, requests, staff, stock history and private settings, and can't read discount codes, PKR costs or tailor phones. No visitor writes. |
| Privileged database functions | Listed every `security definer` function and who may run it | ✅ `create_order`, `rate_limit_hit` server only; `staff_names` staff only. Fixed: trigger functions and staff checks no longer callable by visitors (migration `20261117000001`). |
| Secret (service-role) key | Searched the code; checked what reaches the browser | ✅ Only read in `lib/supabase/admin.ts` (marked server-only, so the build fails if browser code imports it). Used by the website routes, the rate limiter, owner-only staff actions and the local photo script. Never committed (`.env.local` is git-ignored; `.env.example` has no values). |
| Staff roles | Every back-office page and server action; RLS tests per role | ✅ Every page and action checks the role on the server; the database enforces the same split (66 automated checks). Orders staff can't see PKR cost on order lines. The last owner can't be removed. |
| Rate limits | Sent repeated requests to each route | Fixed: every public form is now limited per visitor (see below). |
| Inputs | Read each route and action | ✅ Server re-prices orders (never trusts browser prices); screenshots and photos checked by their bytes; customer links shown as text unless plain http(s); CSV cells can't run as formulas; WhatsApp texts URL-encoded. |
| Sign-in | Supabase Auth settings | ✅ Email only, new sign-ups off, link works only in the browser that asked for it. |

## Rate limits (per visitor, counted in the database)

| Form | Limit |
|---|---|
| Discount code check | 10 per 10 minutes |
| WhatsApp order | 8 per hour |
| Sourcing / notify-me / pre-order | 6 per hour |
| Track my order | 20 per 10 minutes |
| Test-site password | 10 per 15 minutes |
| Back-office sign-in email / code | 5 / 10 per 15 minutes (on top of Supabase's own) |

## Fixed in this step

1. **Rate limits** added to orders, requests, Track my order, the test-site password and the back-office sign-in (only the code check had one).
2. **Security headers** on every page: no framing by other sites (click-jacking), `nosniff`, strict referrer, camera/microphone/location/payment off, always-https (HSTS).
3. **Sign-in cookie is httpOnly**: page scripts can't read the back-office session.
4. **`/[locale]/dev/products` test page** no longer exists on the live site.
5. **Function permissions tidied** (migration `20261117000001_security_hardening.sql`).
6. **Password screen** now only accepts posts from this site.

## Still open (Step 32 list, updated 13 Nov 2026)

1. ~~Next.js advisory~~ **Done** (12 Nov 2026): Next.js 16; `npm audit --omit=dev` = 0 vulnerabilities.
2. **Email sender.** Gmail SMTP for development; switch to Zoho ZeptoMail before launch.
3. **Remove `SITE_PASSWORD`** in Vercel on launch day (the test-site password).
4. **Test data**: see the go-live list below.
5. **No full Content-Security-Policy for scripts yet.** Now possible with Next.js 16 (nonces); optional before launch.

---

# Security check — Phase 3B · A11 (13 Nov 2026)

Customer accounts, notifications, favourites and addresses, My tailor, recommendations, Thaanora Circle and offers, returns, reviews, privacy tools, Customers, COD protection, announcements.

| Area | How | Result |
|---|---|---|
| Row Level Security | Every migration in a test database; automated checks per role (238 in total) | ✅ All 26 tables have RLS. A customer reads only her own profile, addresses, favourites, notifications, offers, returns; never staff notes/tags (separate `customer_notes` table). Public reviews never expose who wrote them beyond first name + initial. Catalogue staff can't see customers, returns or customer figures; orders staff can't change levels, offers or reviews. |
| View permissions | Listed write grants for visitors | Fixed: Supabase's defaults gave visitors write rights on the new views; now read-only (migration `20261130000001_view_grants.sql`). A permanent check fails if any visitor write right appears again. |
| Server-only functions | Listed every `security definer` function | ✅ 27 functions; none callable by visitors; only the 5 role-check helpers callable by signed-in users. Counts, notices, `notify_many`, `refusal_count`, `trending_scores` are server only. |
| Money rules in the database | Triggers + unique indexes | ✅ Birthday gift once a year and a personal offer once (unique indexes); a return only for her own delivered order inside the window; refunded/exchanged only after a Zoho credit note; stock back on "received". |
| Server routes and actions | Read each one | ✅ Every customer action checks her session (`getAccount`), every back-office action checks the staff role. Prices, discounts, refunds, Circle level and COD flag are worked out on the server, never taken from the browser. Customer-only pages redirect guests. |
| Rate limits | `lib/rate-limit.ts` | ✅ Added: return requests 5/hour, reviews 10/hour, "download my data" 5/hour, trending events 60/10 min, sign-in emails 5 / codes 10 per 15 min, add-an-order claim 10/15 min. |
| Personal data (PDPL) | Privacy page | ✅ "Download my data" (JSON, own rows only, no staff notes or costs). "Deactivate my account" removes addresses, favourites, measurements, tailor, birthday, notifications and offers, hides reviews, signs out; orders/invoices/returns kept for tax. No card or bank details are ever stored (IBAN asked on WhatsApp only). |
| Secrets | Searched tracked files; listed browser variables | ✅ Only `NEXT_PUBLIC_SUPABASE_URL` and the anon key reach the browser. Zoho keys and the secret key stay on the server; nothing secret is committed. |
| Dependencies | `npm audit --omit=dev` | ✅ 0 vulnerabilities. |
| Output | Searched for raw HTML | ✅ No `dangerouslySetInnerHTML` beyond structured data; review and request texts are shown as text. |

## Before launch (Phase 3B items)
1. Vercel: `ZOHO_REFRESH_TOKEN` = the new token with `ZohoBooks.creditnotes.ALL`.
2. Turn on SMS sign-in (Taqnyat), then "Ask customers to sign in before ordering".
3. Zoho ZATCA e-invoicing on; ask the accountant about credit notes for returns.
4. Delete test data: orders TH-1001…TH-1010, return RT-1001 (reset its counter), test offers and announcements, TT-098 / TEST-001; Zoho INV-000003 + payment and CN-00001 + refund.
