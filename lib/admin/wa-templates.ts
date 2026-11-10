import "server-only";
import { getTranslations } from "next-intl/server";
import { getSessionClient } from "@/lib/supabase/server";
import { isTemplateLang, parseTemplates, SETTINGS_KEY, TEMPLATE_KINDS, TEMPLATE_LANGS, type TemplateKind, type TemplateLang, type Templates } from "@/lib/wa-templates";

// The owner's saved templates (owner and orders team may read them; RLS hides them from everyone else).
export async function getSavedTemplates(): Promise<Templates> {
  const supabase = await getSessionClient();
  const { data } = await supabase.from("settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  return parseTemplates(data?.value);
}

// The built-in text for a language, from the translation files.
export async function defaultTemplate(kind: TemplateKind, locale: string): Promise<string> {
  const t = await getTranslations({ locale, namespace: "WaTemplates" });
  return String(t.raw(kind));
}

// What the customer gets: the owner's version in English/Arabic, otherwise the built-in text.
export async function templateFor(kind: TemplateKind, locale: string, saved?: Templates): Promise<string> {
  if (isTemplateLang(locale)) {
    const own = (saved ?? (await getSavedTemplates()))[locale]?.[kind];
    if (own) return own;
  }
  return defaultTemplate(kind, locale);
}

// Every built-in text, for the Settings editor ("Use the default").
export async function allDefaults(): Promise<Record<TemplateLang, Record<TemplateKind, string>>> {
  const out = {} as Record<TemplateLang, Record<TemplateKind, string>>;
  for (const lang of TEMPLATE_LANGS) {
    out[lang] = {} as Record<TemplateKind, string>;
    for (const kind of TEMPLATE_KINDS) out[lang][kind] = await defaultTemplate(kind, lang);
  }
  return out;
}
