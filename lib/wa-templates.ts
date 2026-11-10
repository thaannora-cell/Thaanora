// WhatsApp message templates: the ready texts staff send to customers. Plain functions, so the
// back office can preview them in the browser (sourcing quote) and the server can build them.

export const TEMPLATE_KINDS = ["received", "confirmed", "onTheWay", "delivered", "sourcingQuote"] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

// Owners edit English and Arabic; Urdu and Hindi customers get the built-in text.
export const TEMPLATE_LANGS = ["en", "ar"] as const;
export type TemplateLang = (typeof TEMPLATE_LANGS)[number];
export type Templates = Partial<Record<TemplateLang, Partial<Record<TemplateKind, string>>>>;

export const TEMPLATE_MAX = 1000;
export const SETTINGS_KEY = "whatsapp_templates";

// The {words} each message can fill in.
export const PLACEHOLDERS: Record<TemplateKind, readonly string[]> = {
  received: ["name", "orderNo", "items", "total", "area", "shopNumber"],
  confirmed: ["name", "orderNo", "total", "area", "shopNumber"],
  onTheWay: ["name", "orderNo", "total", "courier", "trackingNo", "trackingLink", "shopNumber"],
  delivered: ["name", "orderNo", "total", "shopNumber"],
  sourcingQuote: ["name", "ref", "what", "price", "days", "shopNumber"],
};

const WORD = /\{(\w+)\}/g;

export const isTemplateLang = (l: string): l is TemplateLang => (TEMPLATE_LANGS as readonly string[]).includes(l);

// Placeholders in a template that this message can't fill (typos such as {nmae}).
export function unknownPlaceholders(kind: TemplateKind, text: string): string[] {
  const allowed = PLACEHOLDERS[kind];
  return [...new Set([...text.matchAll(WORD)].map((m) => m[1]).filter((w) => !allowed.includes(w)))];
}

// Fills in the {words}. A line whose word has no value (e.g. no tracking number yet) is left out,
// and a value with several lines (the list of suits) keeps them.
export function fillTemplate(template: string, values: Record<string, string | null | undefined>): string {
  const lines: string[] = [];
  for (const line of template.replace(/\r\n?/g, "\n").split("\n")) {
    const words = [...line.matchAll(WORD)].map((m) => m[1]);
    if (words.some((w) => w in values && !values[w]?.trim())) continue;
    lines.push(line.replace(WORD, (all, w: string) => (values[w] ? String(values[w]) : all)));
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// The saved templates, ignoring anything malformed.
export function parseTemplates(value: unknown): Templates {
  const out: Templates = {};
  if (!value || typeof value !== "object") return out;
  for (const lang of TEMPLATE_LANGS) {
    const src = (value as Record<string, unknown>)[lang];
    if (!src || typeof src !== "object") continue;
    for (const kind of TEMPLATE_KINDS) {
      const t = (src as Record<string, unknown>)[kind];
      if (typeof t === "string" && t.trim()) (out[lang] ??= {})[kind] = t.slice(0, TEMPLATE_MAX);
    }
  }
  return out;
}

// "+966 50 123 4567" for Saudi numbers, "+<digits>" otherwise.
export function displayNumber(digits: string): string {
  const m = /^966(5\d)(\d{3})(\d{4})$/.exec(digits);
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}
