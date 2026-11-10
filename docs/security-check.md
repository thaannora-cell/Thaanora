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

## Still open (decide before launch)

1. **Next.js advisory (postcss inside Next.js).** `npm audit` reports it; it only processes our own CSS at build time, so visitors can't reach it. The fix needs Next.js 16 (a major upgrade) — plan it as its own step.
2. **Email sender.** Supabase's built-in sender only reaches your Supabase team and a few emails an hour. Connect your own SMTP before adding staff.
3. **Remove `SITE_PASSWORD`** in Vercel on launch day (the test-site password).
4. **Test data**: test orders (TH-1001, TH-1002), TEST-001, TEST20, "Test sale", test stock changes. Clean up and reset the order counter before launch.
5. **No full Content-Security-Policy for scripts yet.** React already escapes all text; a strict script policy needs per-request nonces and is best added with the Next.js 16 upgrade.
