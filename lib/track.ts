// Counts a suit being opened or added, for "Trending in Riyadh" (anonymous; see /api/events).
// Fire-and-forget: never slows the page or shows an error.
export function trackSuit(code: string, kind: "view" | "add") {
  try {
    const body = JSON.stringify({ code, kind });
    if (navigator.sendBeacon?.("/api/events", new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
  } catch {
    /* ignore */
  }
}
