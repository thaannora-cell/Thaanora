import "server-only";

// Zoho Books API client. Server only: the keys come from environment variables (.env.local locally,
// Vercel → Settings → Environment Variables when live) and never reach the browser.
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN  – from api-console.zoho.sa (Self Client)
//   ZOHO_ORG_ID                                            – Zoho Books → Settings → Organisation profile
//   ZOHO_DC        (optional, default "sa")                – the Zoho data centre: sa, com, eu, in, ae …
//   ZOHO_VAT_TAX_ID (optional)                             – the 15% VAT tax id; looked up when empty

export class ZohoError extends Error {
  readonly retry: boolean; // network trouble, rate limit or Zoho's servers: worth trying again
  constructor(message: string, retry: boolean) {
    super(message);
    this.retry = retry;
  }
}

type Config = { clientId: string; clientSecret: string; refreshToken: string; orgId: string; accounts: string; api: string };

export function zohoConfig(): Config | null {
  const e = process.env;
  if (!e.ZOHO_CLIENT_ID || !e.ZOHO_CLIENT_SECRET || !e.ZOHO_REFRESH_TOKEN || !e.ZOHO_ORG_ID) return null;
  const dc = (e.ZOHO_DC || "sa").replace(/[^a-z.]/gi, "");
  return {
    clientId: e.ZOHO_CLIENT_ID,
    clientSecret: e.ZOHO_CLIENT_SECRET,
    refreshToken: e.ZOHO_REFRESH_TOKEN,
    orgId: e.ZOHO_ORG_ID,
    // The two *_URL overrides exist only for local tests against a stand-in server.
    accounts: e.ZOHO_ACCOUNTS_URL || `https://accounts.zoho.${dc}`,
    api: e.ZOHO_API_URL || `https://www.zohoapis.${dc}`,
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Up to 3 tries for problems that usually pass (network, 429, 5xx); others fail at once.
async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      const again = err instanceof ZohoError ? err.retry : true;
      if (!again || attempt >= 3) throw err instanceof ZohoError ? err : new ZohoError(String((err as Error)?.message ?? err), true);
      await wait(attempt * 800);
    }
  }
}

// Access tokens last an hour; keep one per server instance and renew a minute early.
let token: { value: string; until: number } | null = null;

async function accessToken(c: Config): Promise<string> {
  if (token && token.until > Date.now()) return token.value;
  const body = new URLSearchParams({ refresh_token: c.refreshToken, client_id: c.clientId, client_secret: c.clientSecret, grant_type: "refresh_token" });
  const res = await fetch(`${c.accounts}/oauth/v2/token`, { method: "POST", body, signal: AbortSignal.timeout(15000), cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    throw new ZohoError(`Zoho sign-in failed: ${data.error ?? res.status}`, res.status === 429 || res.status >= 500);
  }
  token = { value: data.access_token, until: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000 };
  return token.value;
}

type ZohoReply = { code?: number; message?: string } & Record<string, unknown>;

export async function zoho<T = ZohoReply>(c: Config, method: "GET" | "POST" | "PUT", path: string, body?: unknown, query: Record<string, string> = {}): Promise<T> {
  return withRetry(async () => {
    const url = new URL(`${c.api}/books/v3${path}`);
    url.searchParams.set("organization_id", c.orgId);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Zoho-oauthtoken ${await accessToken(c)}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (res.status === 401) token = null; // expired or revoked: sign in again next time
    const data = (await res.json().catch(() => ({}))) as ZohoReply;
    if (!res.ok || (typeof data.code === "number" && data.code !== 0)) {
      throw new ZohoError(`Zoho ${res.status}${data.code ? ` (code ${data.code})` : ""}: ${data.message ?? "no message"}`, res.status === 401 || res.status === 429 || res.status >= 500);
    }
    return data as T;
  });
}

// The invoice as a PDF, for the back office's "View invoice".
export async function zohoInvoicePdf(c: Config, invoiceId: string): Promise<ArrayBuffer> {
  return withRetry(async () => {
    const url = new URL(`${c.api}/books/v3/invoices/${encodeURIComponent(invoiceId)}`);
    url.searchParams.set("organization_id", c.orgId);
    url.searchParams.set("accept", "pdf");
    const res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${await accessToken(c)}` }, signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (res.status === 401) token = null;
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) {
      throw new ZohoError(`Zoho PDF ${res.status}`, res.status === 401 || res.status === 429 || res.status >= 500);
    }
    return res.arrayBuffer();
  });
}

// The 15% VAT tax set up in Zoho Books (or ZOHO_VAT_TAX_ID).
let vatTax: string | null = null;
export async function zohoVatTaxId(c: Config, pct: number): Promise<string> {
  if (process.env.ZOHO_VAT_TAX_ID) return process.env.ZOHO_VAT_TAX_ID;
  if (vatTax) return vatTax;
  const data = await zoho<{ taxes?: { tax_id: string; tax_percentage: number }[] }>(c, "GET", "/settings/taxes");
  const found = (data.taxes ?? []).find((t) => Number(t.tax_percentage) === pct);
  if (!found) throw new ZohoError(`No ${pct}% tax in Zoho Books. Add it under Settings → Taxes, or set ZOHO_VAT_TAX_ID.`, false);
  vatTax = found.tax_id;
  return vatTax;
}
