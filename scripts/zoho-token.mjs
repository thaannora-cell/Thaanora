// One-time helper: swaps the code from Zoho's API Console (Self Client → Generate Code) for a refresh
// token and saves it as ZOHO_REFRESH_TOKEN in .env.local. Run within 10 minutes of generating the code:
//   npm run zoho:token -- <code>
// Reads ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET and ZOHO_DC from .env.local. Prints no secrets.
import fs from "node:fs";

const FILE = ".env.local";
const code = (process.argv[2] ?? "").trim();
if (!code) {
  console.error("Usage: npm run zoho:token -- <code from Zoho API Console>");
  process.exit(1);
}
const text = fs.readFileSync(FILE, "utf8");
const env = Object.fromEntries(
  text.split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
if (!env.ZOHO_CLIENT_ID || !env.ZOHO_CLIENT_SECRET) {
  console.error("Add ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET to .env.local first.");
  process.exit(1);
}
const dc = (env.ZOHO_DC || "sa").replace(/[^a-z.]/gi, "");
const body = new URLSearchParams({ grant_type: "authorization_code", client_id: env.ZOHO_CLIENT_ID, client_secret: env.ZOHO_CLIENT_SECRET, code });
const res = await fetch(`https://accounts.zoho.${dc}/oauth/v2/token`, { method: "POST", body });
const data = await res.json().catch(() => ({}));
if (!data.refresh_token) {
  console.error(`Zoho said: ${data.error ?? res.status}.`);
  console.error(data.error === "invalid_code" ? "The code expired or was already used. Generate a new one (10 minutes) and run this again." : "Check the Client ID / Secret and that ZOHO_DC matches your account (sa).");
  process.exit(1);
}
const line = `ZOHO_REFRESH_TOKEN=${data.refresh_token}`;
const next = /^ZOHO_REFRESH_TOKEN=.*$/m.test(text) ? text.replace(/^ZOHO_REFRESH_TOKEN=.*$/m, line) : `${text.replace(/\s*$/, "")}\n${line}\n`;
fs.writeFileSync(FILE, next);
console.log(`Saved ZOHO_REFRESH_TOKEN in ${FILE} (scope: ${data.scope ?? "?"}). Also add it in Vercel → Environment Variables.`);
