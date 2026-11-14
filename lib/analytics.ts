// Analytics and ad pixels (Step 36). Browser only. Nothing is loaded or sent until the visitor accepts
// on the consent banner (PDPL). A provider without its ID (Vercel setting) stays off.
//   NEXT_PUBLIC_GA4_ID, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_TIKTOK_PIXEL_ID, NEXT_PUBLIC_SNAP_PIXEL_ID

export const IDS = {
  ga4: process.env.NEXT_PUBLIC_GA4_ID ?? "",
  meta: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "",
  snap: process.env.NEXT_PUBLIC_SNAP_PIXEL_ID ?? "",
};
const VALID = { ga4: /^G-[A-Z0-9]{4,20}$/, meta: /^\d{6,20}$/, tiktok: /^[A-Z0-9]{8,30}$/, snap: /^[0-9a-f-]{20,40}$/i };
export const enabled = (k: keyof typeof IDS) => VALID[k].test(IDS[k]);
export const anyEnabled = () => (Object.keys(IDS) as (keyof typeof IDS)[]).some(enabled);

export type Consent = "granted" | "denied";
const KEY = "th_consent";
export const CONSENT_OPEN = "th:consent-open"; // footer "Cookie settings" asks the banner to show again
export const CONSENT_CHANGED = "th:consent-changed";

export function readConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}
export function saveConsent(v: Consent) {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* private mode: ask again next visit */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: v }));
}

type W = Window & {
  dataLayer?: unknown[];
  gtag?: (...a: unknown[]) => void;
  fbq?: ((...a: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
  ttq?: { track: (e: string, p?: unknown) => void; page: () => void; load: (id: string) => void } & Record<string, unknown>;
  TiktokAnalyticsObject?: string;
  snaptr?: ((...a: unknown[]) => void) & { queue?: unknown[]; handleRequest?: unknown };
};
const w = () => window as W;

function addScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

let loaded = false;
// Load the providers that have an ID. Called once she accepts (or on page load if she accepted before).
export function loadProviders() {
  if (loaded || typeof window === "undefined" || readConsent() !== "granted") return;
  loaded = true;
  const win = w();
  if (enabled("ga4")) {
    win.dataLayer = win.dataLayer || [];
    win.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer!.push(arguments);
    };
    win.gtag("js", new Date());
    win.gtag("config", IDS.ga4, { anonymize_ip: true });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(IDS.ga4)}`);
  }
  if (enabled("meta")) {
    const fbq = function (...args: unknown[]) {
      const f = fbq as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
      if (f.callMethod) f.callMethod(...args);
      else f.queue.push(args);
    } as W["fbq"] & { queue: unknown[] };
    fbq!.queue = [];
    fbq!.loaded = true;
    fbq!.version = "2.0";
    fbq!.push = fbq;
    win.fbq = fbq;
    win._fbq = fbq;
    addScript("https://connect.facebook.net/en_US/fbevents.js");
    win.fbq!("init", IDS.meta);
    win.fbq!("track", "PageView");
  }
  if (enabled("tiktok")) {
    // TikTok's own loader (its standard snippet, written out): calls queue in the array until events.js arrives.
    win.TiktokAnalyticsObject = "ttq";
    const ttq = [] as unknown as unknown[] & Record<string, unknown>;
    const methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
    const defer = (target: unknown[] & Record<string, unknown>, m: string) => {
      target[m] = (...a: unknown[]) => target.push([m, ...a]);
    };
    ttq.methods = methods;
    ttq.setAndDefer = defer;
    for (const m of methods) defer(ttq, m);
    ttq._i = { [IDS.tiktok]: Object.assign([], { _u: "https://analytics.tiktok.com/i18n/pixel/events.js" }) };
    ttq._t = { [IDS.tiktok]: Date.now() };
    ttq._o = { [IDS.tiktok]: {} };
    ttq.instance = (id: string) => {
      const inst = ((ttq._i as Record<string, unknown[] & Record<string, unknown>>)[id] ?? []) as unknown[] & Record<string, unknown>;
      for (const m of methods) defer(inst, m);
      return inst;
    };
    win.ttq = ttq as unknown as W["ttq"];
    addScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(IDS.tiktok)}&lib=ttq`);
    win.ttq!.page();
  }
  if (enabled("snap")) {
    const snaptr = function (...args: unknown[]) {
      const s = snaptr as unknown as { handleRequest?: (...a: unknown[]) => void; queue: unknown[] };
      if (s.handleRequest) s.handleRequest(...args);
      else s.queue.push(args);
    } as W["snaptr"] & { queue: unknown[] };
    snaptr!.queue = [];
    win.snaptr = snaptr;
    addScript("https://sc-static.net/scevent.min.js");
    win.snaptr!("init", IDS.snap, {});
    win.snaptr!("track", "PAGE_VIEW");
  }
}

// One shop event, sent to every provider that's on (and only after consent).
export type ShopEvent =
  | { name: "view_item"; code: string; value?: number }
  | { name: "add_to_cart"; code: string; value?: number }
  | { name: "try_on"; code: string }
  | { name: "begin_checkout"; value: number; count: number }
  | { name: "lead"; orderNo: string; value: number; codes: string[] }
  | { name: "sourcing_request" };

export function track(e: ShopEvent) {
  if (typeof window === "undefined" || !loaded) return;
  const win = w();
  try {
    const value = "value" in e ? e.value : undefined;
    const currency = value !== undefined ? { currency: "SAR", value } : {};
    const items = "code" in e ? [{ item_id: e.code }] : e.name === "lead" ? e.codes.map((c) => ({ item_id: c })) : undefined;
    // GA4 (recommended event names)
    const ga = { view_item: "view_item", add_to_cart: "add_to_cart", try_on: "try_on", begin_checkout: "begin_checkout", lead: "generate_lead", sourcing_request: "sourcing_request" }[e.name];
    win.gtag?.("event", ga, { ...currency, ...(items ? { items } : {}), ...(e.name === "lead" ? { transaction_id: e.orderNo } : {}) });
    // Meta
    const fb = { view_item: "ViewContent", add_to_cart: "AddToCart", try_on: "CustomizeProduct", begin_checkout: "InitiateCheckout", lead: "Lead", sourcing_request: "Contact" }[e.name];
    win.fbq?.("track", fb, { ...currency, ...(items ? { content_ids: items.map((i) => i.item_id), content_type: "product" } : {}) });
    // TikTok
    const tt = { view_item: "ViewContent", add_to_cart: "AddToCart", try_on: "ClickButton", begin_checkout: "InitiateCheckout", lead: "SubmitForm", sourcing_request: "Contact" }[e.name];
    win.ttq?.track(tt, { ...currency, ...(items ? { contents: items.map((i) => ({ content_id: i.item_id })) } : {}) });
    // Snapchat
    const sn = { view_item: "VIEW_CONTENT", add_to_cart: "ADD_CART", try_on: "CUSTOM_EVENT_1", begin_checkout: "START_CHECKOUT", lead: "SIGN_UP", sourcing_request: "CUSTOM_EVENT_2" }[e.name];
    win.snaptr?.("track", sn, { ...(value !== undefined ? { price: value, currency: "SAR" } : {}), ...(items ? { item_ids: items.map((i) => i.item_id) } : {}) });
  } catch {
    /* analytics must never break the shop */
  }
}
