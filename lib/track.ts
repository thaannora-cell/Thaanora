import { track } from "./analytics";

// Counts a suit being opened or added, for "Trending in Riyadh" (anonymous; see /api/events), and tells
// analytics (only if she accepted cookies). Fire-and-forget: never slows the page or shows an error.
export function trackSuit(code: string, kind: "view" | "add", value?: number) {
  track(kind === "view" ? { name: "view_item", code, value } : { name: "add_to_cart", code, value });
  try {
    const body = JSON.stringify({ code, kind });
    if (navigator.sendBeacon?.("/api/events", new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
  } catch {
    /* ignore */
  }
}
