# Thaanora — project brief for Claude Code

Thaanora (ثانورا) sells original Pakistani unstitched women's suits in Riyadh.
Tagline: "Your fabric. Your fit." · Arabic: قماشكِ… على مقاسكِ
Orders are placed on WhatsApp and paid **cash on delivery (COD) only**. No online payments.

The approved designs are in `docs/`:
- `docs/thaanora-website-prototype.html` — the approved website AND back office (open it in a browser; the gold crown button opens the back office, PIN 1234). This file is the visual and functional reference. Match it.
- `docs/Thaanora-Brand-Guidelines.pdf` — logo, colours, fonts, patterns, do's and don'ts.
- `docs/Thaanora-Build-Plan.xlsx` — milestones and go-live checklist.

## Stack
- Next.js (App Router) + TypeScript, Tailwind CSS
- Supabase: Postgres database, Storage (product photos), Auth (owner and staff sign-in by phone one-time code)
- Hosting: Vercel, connected to GitHub repo `thaannora-cell/Thaanora`
- i18n: English, Arabic, Urdu, Hindi. Arabic and Urdu are right-to-left (`dir="rtl"`). Use logical CSS (`ms-`, `me-`, `start`, `end`), never left/right.

## Brand tokens (use these exact values)
| Token | Hex | Use |
|---|---|---|
| emerald | #0E3B2E | main brand colour, header, hero, buttons |
| emerald-deep | #082A20 / #0A2C22 | footer, back-office sidebar |
| gold | #C8A15A | lines, borders, icons, rings |
| gold-light | #E6CB8E | gold text on emerald |
| gold-ink | #8A6A2E | gold text on light backgrounds |
| ivory | #F6F3EE / #F2EEE6 | page background |
| ivory-white | #FBF8F2 | cards |
| rani-pink | #C81E5E | ONE accent per screen: sale tags, main CTA, ث mark |
| indigo #1F2E5C, walnut #5A3A26, blush #D9A5A0 | | supporting only |

Fonts (Google Fonts): Cinzel (logo, short caps labels), Cormorant Garamond (headlines), Jost (body, UI), Amiri (Arabic), Noto Nastaliq Urdu (Urdu, line-height ~1.9), Noto Sans Devanagari (Hindi).
Logo: round emerald medal with serif "T", small pink ث above the final A of THAANORA.
Motion: subtle animated line icons (scissors snip, truck drives, sparkle twinkles), hover lift, tap ripple. Always respect `prefers-reduced-motion`.

## Core website features (from the prototype)
- Top bar (rotating offers), header with service pills (Virtual try-on, Tailor network, Sourcing request, Track order), language switcher, bag button with count.
- Green hero + white filter card: occasion chips (All, New, Everyday, Eid, Wedding, Birthday, Anniversary, Gifts, Sale, Saved), colour dots, search, brand dropdown.
- **Fabric rack**: products as hanging vertical strips; tapping one opens a panel with the model photo, price, stock, fabric lengths (shirt 3 m, dupatta 2.5 m, trouser 2.5 m), Add, Try on me, Get it stitched, Details & reviews, Share. Phone: stacked shelf.
- Selection tray (bottom), bundle rule (default: 3+ suits = 10% off), discount codes, packaging choice (free Suit Keeper bag / gift box +SAR 15), gift option, delivery fee by Riyadh area, totals (VAT shown only when `vat_rate_pct` > 0), "Copy/Send order on WhatsApp".
- Order tracking, sourcing request, notify-me/pre-order, tailor network + saved measurements, AI try-on preview (simple face-on-model first), policy pages, floating WhatsApp help button.

## Back office (owner/staff only)
Dashboard, Orders (COD statuses: Waiting for confirmation → Confirmed → Packed → With the courier → Delivered · cash collected / Refused at door / Cancelled; courier + tracking no.), Products (photo upload, price, sale %, PKR cost, margin, stock, labels, visible), Stock (adjust, receive shipment), Offers & codes, Seasons & labels (campaigns, brand of the month, top-bar messages), Requests, Tailors, Reports, Settings (WhatsApp number, social links, delivery fees, CR/VAT/address, PKR rate, low-stock level), Staff & access.

## Data rules
- Prices in SAR. The seller is Desert Bloom Poultry Company (one-person LLC, Unified National No. 7054375741); Thaanora is its brand. It is NOT VAT-registered: `vat_rate_pct` = 0 and no VAT wording is shown. When it registers, set `vat_rate_pct` to 15 and the VAT number in `business`; prices are then treated as VAT-inclusive. Store purchase cost in PKR; never show cost to customers.
- Website reads only visible products and public settings. All writes from the website (orders, requests) go through server routes, never directly from the browser with elevated keys.
- Row Level Security ON for every table.

## Working rules for Claude Code
- Work one step at a time. Before coding, say what you will change. After coding, run the app, check it at phone width (390 px) and desktop, in English and Arabic.
- Never commit secrets. Keys live in `.env.local` (git-ignored) and in Vercel environment variables. The Supabase service-role key is server-only.
- Commit after each step with a clear message, then push to `main`.
- Keep components small and reusable. Keep text in translation files, never hard-coded.
- Product photos belong to the brands. Use them only after written permission, or use Thaanora's own photos.
