# Phase 3B — Customer accounts ("My Thaanora")

Read this together with `CLAUDE.md`. Phases 1–3 are done: the shop website, guest checkout with orders sent on WhatsApp (cash on delivery), and the back office at `/admin`. Phase 4 Steps 33–35 are done; Steps 36 (analytics) and 37 (AI try-on) are on hold until Phase 3B is finished.

## Goal
Give customers an account so everything follows them between visits: orders, delivery status, favourites, offers, gifts, their tailor and notifications. Add the matching back-office screens so the owner can manage customers, loyalty, picks, trending, notifications, stitching, returns and reviews.

## Decisions already made (do not change without asking)
1. **Guest checkout stays.** Never force sign-in to order. After a guest order, offer "Save this order: create your account".
2. **Sign-in now: email one-time code (6 digits).** Later: SMS code through **Taqnyat** using a Supabase Send SMS Hook. Build so SMS can be **added to the same accounts** later (identity linking) with a back-office switch: Email / SMS / Both.
3. **Phone number is the customer's key.** Always collect the Saudi mobile at sign-up (05XXXXXXXX, store as +9665XXXXXXXX). Link earlier guest orders with the same phone automatically.
4. **One discount per order:** the single best of loyalty level, bundle offer, campaign or code applies. Discounts never stack. Show the customer which one was applied.
5. **Loyalty is simple levels, not points**, based on suits bought in the last 12 months. Defaults (editable in the back office):
   | Level | Rule | Benefits |
   |---|---|---|
   | Welcome | first order | 10% off first order + free Suit Keeper bag |
   | Silver | 3 suits | 5% off every order + free gift box |
   | Gold | 6 suits | 10% off + free gift box + early sale access |
   | Emerald | 12 suits | 15% off + Eid surprise gift + priority sourcing |
   Plus a birthday gift at every level. Show progress: "2 more suits to Gold".
6. **Design:** same look as the approved prototype (`docs/thaanora-website-prototype.html`): emerald, gold, ivory, one Rani Pink accent, animated line icons, fabric-rack feel. All 4 languages, Arabic and Urdu right-to-left, phone first (390 px).
7. **Privacy (PDPL):** customers can download and delete their data. Try-on photos are never stored on the server in this phase.

## Customer side: "My Thaanora"
Account entry from the header (person icon next to the bag). Routes under `/[locale]/account/...`.

| Section | Contents |
|---|---|
| Sign in / sign up | email code; name, mobile, language, birthday (optional) |
| Overview | greeting, Circle level card with progress, latest order status, unread notifications, quick links |
| Notifications 🔔 | bell in the header with unread count (also for guests via local storage is NOT needed: accounts only). Types: order status changed, favourite back in stock, price drop on a favourite, new arrival from a favourite brand, new offer, level up, birthday gift, sourcing quote ready, stitching ready. Mark read / mark all read. Per-type switch: in-site only or also WhatsApp. |
| My orders | list + detail, live status timeline, courier link, invoice link, reorder (adds same items if in stock), cancel while "Waiting for confirmation", request return within the policy window |
| Favourites | synced hearts; works with the rack; guests' local hearts merge into the account at sign-in |
| My tailor | partner tailors near her area, choose "my tailor", measurement profile (saved to account), stitching orders with status (Sent to tailor → Stitching → Ready → Collected/Delivered), her member discount |
| Trending | "Trending in Riyadh this week": ranked by orders and views of the last 7 days, owner can pin/remove |
| Thaanora recommends | "Our picks" (owner-chosen suits with a short note) and "For you" (by her favourite colours, brands, occasions and past orders; never repeat bought items) |
| My offers | her personal codes, birthday gift, level benefits, active campaigns; each shows expiry |
| Thaanora Circle | level, benefits, progress bar, history of gifts received |
| Addresses | saved addresses with district and map pin, plus gift recipients |
| My requests | sourcing quotes, pre-orders, notify-me items, with status |
| Reviews | review only delivered items; optional photo; shown after owner approval |
| Settings & privacy | language, notification switches, download my data, delete my account |

Checkout changes: signed-in customers get saved address, phone and measurements pre-filled; the applied discount (level / bundle / code / campaign) is shown by name.

## Back office additions (`/admin`)
| Screen | Contents |
|---|---|
| Customers | list with search and filters (level, area, tags, last order); profile: contact, orders, total spent, level, favourites, requests, notes, tags (VIP, wholesale, risk) |
| COD protection | refusal count per customer; setting: after N refusals require phone confirmation or block COD |
| Loyalty levels | edit levels, rules, benefits, birthday gift; count of customers per level |
| Our picks | choose recommended suits, order them, write the note (4 languages) |
| Trending | automatic list with pin / remove and the time window |
| Notifications | compose an announcement to a segment (all, level, brand fans, inactive 60 days, birthday this month); switch each automatic alert on/off; delivery log |
| Stitching orders | suits sent to tailors, status, due date, tailor, customer |
| Targeted offers | personal or segment codes with expiry and use limits |
| Returns | requests from customers; approve/reject; record refund or exchange; stock goes back when received |
| Reviews | approve / hide; reply |
| Reports | new vs returning, repeat rate, customers per level, top customers, discounts given by type |
| Settings | sign-in method Email / SMS / Both; return window days; COD refusal rule |

## Data model (proposal; adapt to the existing schema)
New tables, all with Row Level Security (customer sees only own rows; staff by role):
`customers` (linked to auth user; name, phone, language, birthday, tags, notes, refusal_count, tailor_id), `addresses`, `favorites`, `notifications`, `notification_prefs`, `loyalty_levels`, `customer_offers`, `offer_redemptions`, `picks`, `trending_overrides`, `product_events` (views/adds for trending), `stitching_orders`, `returns`, `reviews`. Add `customer_id` to `orders` and `requests`. Trending can be a database view or a scheduled job.

## Steps (one at a time; commit and push after each)
- **A1** Customer sign-in (email code), profile, phone, linking guest orders, header account icon, sign-in method setting.
- **A2** Notifications: bell, unread count, notification centre, types, preferences, triggers from order status changes, WhatsApp opt-in (link to WhatsApp templates from Step 33).
- **A3** My orders: list, detail, timeline, courier and invoice links, reorder, cancel while waiting.
- **A4** Favourites synced (merge guest hearts) and saved addresses (with map pin); prefill checkout.
- **A5** My tailor: tailors near her, choose my tailor, measurements on the account, stitching orders with status.
- **A6** Trending and Thaanora recommends (Our picks + For you), on the home page and in My Thaanora.
- **A7** Thaanora Circle levels, birthday gift, personal offers, "one best discount" rule in checkout.
- **A8** Returns request, reviews (delivered items only), privacy: download and delete data.
- **A9** Back office: Customers, profiles, tags, notes, COD protection.
- **A10** Back office: Loyalty levels, Our picks, Trending, Notifications composer, Stitching orders, Targeted offers, Returns, Reviews.
- **A11** Reports update, full security check (RLS on every new table, rate limits, no secrets in the browser), and a test run of the whole customer journey in EN and AR.

## Definition of done for every step
- Works at 390 px and desktop; English and Arabic checked (Urdu and Hindi texts added).
- All text in translation files; logical CSS for right-to-left.
- RLS on every new table; server routes for any write that needs elevated rights.
- No secrets in code or in the browser.
- A short note at the end: what was built, how to test it, anything left for a later step.
