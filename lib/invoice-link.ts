// Zoho's shareable invoice link, only if it really points at Zoho (it's shown as a clickable link).
const ZOHO_LINK = /^https:\/\/([a-z0-9-]+\.)*zoho(apis|securepay)?\.(com|sa|eu|in|ae|jp|ca|com\.au|com\.cn)\/\S*$/i;

export function safeInvoiceUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const url = v.trim();
  return ZOHO_LINK.test(url) ? url : null;
}
