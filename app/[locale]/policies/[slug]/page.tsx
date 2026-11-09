import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import WhatsAppHelp from "@/components/storefront/WhatsAppHelp";
import { getCheckoutSettings, getSiteInfo } from "@/lib/shop-data";
import { POLICIES, isPolicy, type PolicySlug } from "@/lib/policies";

export const dynamic = "force-dynamic";

// Section ids per page; the text is in messages under Policies.<slug>.<id>_h / <id>_p.
const SECTIONS: Record<PolicySlug, string[]> = {
  returns: ["exchange", "notReturnable", "faulty", "refunds"],
  delivery: ["where", "fees", "timing", "payment"],
  privacy: ["who", "collect", "tryon", "use", "storage", "rights"],
  terms: ["who", "authentic", "prices", "orders", "colour"],
};

// Numbers the owner can change later (shown in the draft as plain values).
const VALUES = { days: 7, refundDays: 5 };

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPolicy(slug)) return {};
  const t = await getTranslations({ locale, namespace: "Policies" });
  return { title: `${t(`${slug}.title`)} · Thaanora` };
}

export default async function PolicyPage({ params }: Params) {
  const { locale, slug } = await params;
  if (!isPolicy(slug)) notFound();
  setRequestLocale(locale);

  const [t, tFooter, tAreas, info, settings] = await Promise.all([
    getTranslations("Policies"),
    getTranslations("Footer"),
    getTranslations("Areas"),
    getSiteInfo(),
    getCheckoutSettings(),
  ]);
  const { legalName, nationalNo } = info.business;
  const vars = { ...VALUES, vat: settings.vatPct, company: legalName, nationalNo: nationalNo || "—" };
  // "Who we are" needs the company name from settings; prices wording depends on VAT registration.
  const sections = SECTIONS[slug].filter((id) => id !== "who" || legalName);
  const textKey = (id: string) =>
    slug === "terms" && id === "prices" && settings.vatPct === 0 ? "terms.prices_noVat_p" : `${slug}.${id}_p`;
  const areaLabel = (area: string) => {
    const key = area.split(/\s+/)[0]?.toLowerCase() ?? "";
    return key && tAreas.has(key) ? tAreas(key) : area;
  };
  const chat = info.whatsapp ? `https://wa.me/${info.whatsapp}` : null;

  return (
    <>
      <Header minimal />
      <main className="mx-auto max-w-[1320px] px-4 pb-16 pt-8 md:pt-12">
        <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <nav aria-label={tFooter("legalPolicies")} className="order-2 md:order-1">
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0 md:flex-col md:gap-1">
              {POLICIES.map((p) => (
                <li key={p}>
                  <Link
                    href={`/policies/${p}`}
                    aria-current={p === slug ? "page" : undefined}
                    className="inline-flex min-h-[40px] items-center rounded-full border border-line bg-ivory-white px-3.5 text-[14px] text-emerald no-underline transition-colors hover:border-gold aria-[current=page]:border-emerald aria-[current=page]:bg-emerald aria-[current=page]:text-gold-light md:w-full md:rounded-xl"
                  >
                    {t(`${p}.title`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <article className="order-1 rounded-[20px] border border-line bg-ivory-white p-5 shadow-[0_10px_30px_rgba(14,59,46,0.06)] md:order-2 md:p-9">
            <span className="th-caps text-[11px] font-medium uppercase tracking-[0.2em] text-gold-ink">{t("eyebrow")}</span>
            <h1 className="mb-3 mt-1 font-[family-name:var(--font-cormorant)] text-[34px] font-semibold leading-tight text-emerald md:text-[42px]">
              {t(`${slug}.title`)}
            </h1>
            <p className="m-0 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2.5 text-[13px] text-walnut">{t("draft")}</p>

            <div className="th-policy">
              {sections.map((id) => (
                <section key={id}>
                  <h2>{id === "who" ? t("who_h") : t(`${slug}.${id}_h`)}</h2>
                  {slug === "delivery" && id === "fees" ? (
                    settings.areas.length > 0 ? (
                      <ul>
                        {settings.areas.map((a) => (
                          <li key={a.area}>
                            {areaLabel(a.area)}: {t("sar", { amount: a.fee })}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{t("delivery.feesAtCheckout")}</p>
                    )
                  ) : (
                    <p>{id === "who" ? t("who_p", vars) : t(textKey(id), vars)}</p>
                  )}
                </section>
              ))}
            </div>

            <p className="mb-0 mt-7 border-t border-line pt-4 text-[14px] text-muted">
              {t("questions")}{" "}
              {chat && (
                <a href={chat} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald underline underline-offset-2">
                  {t("chat")}
                </a>
              )}
            </p>
          </article>
        </div>
      </main>
      <Footer info={info} />
      <WhatsAppHelp whatsapp={info.whatsapp} />
    </>
  );
}
