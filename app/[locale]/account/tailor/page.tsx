import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import ChooseTailor from "@/components/account/ChooseTailor";
import MeasurementsForm from "@/components/account/MeasurementsForm";
import { getAccount } from "@/lib/customer/account";
import { myAddresses } from "@/lib/customer/addresses";
import { myTailorData, tailorNetwork, type NetworkTailor } from "@/lib/customer/tailor";
import { hasMeasurements, MEASURE_FIELDS } from "@/lib/measurements";
import { getCheckoutSettings } from "@/lib/shop-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tailor" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

// My tailor: the partner tailors (her area first), the one she chose, her member discount and her
// measurements. Thaanora isn't part of the stitching: she contacts the tailor herself.
export default async function MyTailorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);

  const [t, tAcc, tPanel, tAreas, mine, network, addresses, settings] = await Promise.all([
    getTranslations("Tailor"),
    getTranslations("Account"),
    getTranslations("Panel"),
    getTranslations("Areas"),
    myTailorData(account.customer.id),
    tailorNetwork(),
    myAddresses(),
    getCheckoutSettings(),
  ]);
  const areaLabel = (a: string) => {
    const key = a.split(/\s+/)[0]?.toLowerCase() ?? "";
    return key && tAreas.has(key) ? tAreas(key) : a;
  };
  const home = addresses.find((a) => a.isDefault && !a.isGift) ?? addresses.find((a) => !a.isGift) ?? null;
  const myArea = home?.area ?? null;
  const chosen = network.find((x) => x.id === mine.tailorId) ?? null;
  const pct = (x: NetworkTailor) => x.pct ?? settings.tailorDiscountPct;
  // Her area first, then the rest in the shop's order.
  const sorted = [...network].sort((a, b) => Number(b.area === myArea) - Number(a.area === myArea));

  // The WhatsApp text to the tailor: who she is and her measurements, ready to send.
  const intro = (x: NetworkTailor) => {
    const m = mine.measurements;
    const lines = [t("waHello", { tailor: x.name, name: account.customer.name.split(/\s+/)[0] ?? account.customer.name, pct: pct(x) })];
    if (hasMeasurements(m)) {
      lines.push("", t("waMeasurements"));
      for (const f of MEASURE_FIELDS) if (m[f]) lines.push(`• ${tPanel(`m_${f}`)}: ${m[f]}`);
      if (m.neck) lines.push(`• ${tPanel("m_neck")}: ${tPanel(`neck_${m.neck}`)}`);
    }
    return `https://wa.me/${x.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
  };
  const contact = (x: NetworkTailor) =>
    x.whatsapp ? (
      <a href={intro(x)} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-emerald underline underline-offset-2">
        {t("contact")}
      </a>
    ) : (
      <span className="text-[12px] text-muted">{t("noContact")}</span>
    );

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">{t("title")}</h1>
      <p className="m-0 mb-4 text-[14px] text-muted">{t("intro")}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card labelledBy="mine">
          <h2 id="mine" className="m-0 mb-2 text-[16px] font-semibold text-emerald">
            {t("mineTitle")}
          </h2>
          {chosen ? (
            <div className="flex flex-col gap-1.5">
              <b className="text-[16px] font-medium text-emerald">{chosen.name}</b>
              <span className="text-[14px] text-muted">{areaLabel(chosen.area)}</span>
              <span className="text-[14px] text-gold-ink">{t("discount", { pct: pct(chosen) })}</span>
              {chosen.note && <span className="text-[13px] text-muted">{chosen.note}</span>}
              <div className="mt-1 flex flex-wrap items-center gap-4">
                {contact(chosen)}
                <ChooseTailor tailorId={chosen.id} chosen />
              </div>
              <p className="mb-0 mt-2 text-[12px] text-muted">{t("contactHint")}</p>
            </div>
          ) : (
            <p className="m-0 text-[14px] text-muted">{t("noneYet")}</p>
          )}
        </Card>

        <Card labelledBy="measure">
          <h2 id="measure" className="m-0 text-[16px] font-semibold text-emerald">
            {t("measurementsTitle")}
          </h2>
          <p className="mb-3 mt-1 text-[13px] text-muted">{t("measurementsIntro")}</p>
          <MeasurementsForm saved={mine.measurements} />
        </Card>

        <Card labelledBy="network" className="md:col-span-2">
          <h2 id="network" className="m-0 text-[16px] font-semibold text-emerald">
            {t("networkTitle")}
          </h2>
          <p className="mb-2 mt-1 text-[13px] text-muted">{myArea ? t("networkIntroArea", { area: areaLabel(myArea) }) : t("networkIntro")}</p>
          {sorted.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">{t("networkEmpty")}</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {sorted.map((x) => (
                <li key={x.id} className={`flex flex-col gap-1 rounded-2xl border p-3 ${x.id === chosen?.id ? "border-gold bg-[#FBF3E6]" : "border-line"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[14px] font-medium text-emerald">{x.name}</b>
                    {x.area === myArea && <span className="rounded-full bg-[#E4F1EA] px-2 py-0.5 text-[11px] text-emerald">{t("nearYou")}</span>}
                    {x.id === chosen?.id && <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] text-emerald">{t("yours")}</span>}
                  </div>
                  <span className="text-[13px] text-muted">
                    {areaLabel(x.area)} · {t("discount", { pct: pct(x) })}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    {contact(x)}
                    {x.id !== chosen?.id && <ChooseTailor tailorId={x.id} chosen={false} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AccountShell>
  );
}
