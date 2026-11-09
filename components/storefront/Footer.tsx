"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SiteInfo } from "@/lib/shop-data";
import { POLICIES, type PolicySlug } from "@/lib/policies";
import { openTrackOrder } from "./TrackOrderDialog";
import { openSourcing } from "./SourcingDialog";
import { openTailors } from "./panel/StitchDialog";

const SOCIAL_LABEL = { instagram: "Instagram", tiktok: "TikTok", snapchat: "Snapchat" } as const;
const linkClass =
  "inline-flex min-h-[30px] items-center text-[#E7EEEA] no-underline transition-[color,transform] duration-200 hover:text-gold-light hover:translate-x-1 rtl:hover:-translate-x-1 motion-reduce:hover:translate-x-0 text-start bg-transparent border-0 p-0 cursor-pointer";

type Props = {
  info: SiteInfo;
  // On the shop page the dialogs are there; elsewhere the care links go back to the shop.
  onShop?: boolean;
};

export default function Footer({ info, onShop = false }: Props) {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();
  const { legalName, nationalNo, vat } = info.business;
  // "Riyadh, Saudi Arabia" is already in the translated line; show only a fuller street address.
  const address = /^riyadh,?\s*saudi arabia$/i.test(info.business.address) ? "" : info.business.address;
  const join = info.whatsapp ? `https://wa.me/${info.whatsapp}?text=${encodeURIComponent(t("joinMessage"))}` : null;

  const care: { key: string; action?: () => void; href?: string }[] = [
    { key: "trackOrder", action: openTrackOrder },
    onShop ? { key: "tailoring", action: openTailors } : { key: "tailoring", href: "/" },
    { key: "sourcing", action: openSourcing },
    { key: "delivery", href: "/policies/delivery" },
  ];
  const legal: PolicySlug[] = POLICIES.filter((p) => p !== "delivery");

  return (
    <footer className="bg-emerald-deep text-[#9FB5AB] text-[14px] border-t border-gold/20">
      <div className="max-w-[1320px] mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gold text-emerald font-[family-name:var(--font-cinzel)] font-semibold text-[18px] shrink-0"
              aria-hidden="true"
            >
              T
            </span>
            <span className="font-[family-name:var(--font-cinzel)] font-semibold tracking-[0.16em] text-[20px] text-white">THAANORA</span>
          </div>
          <p className="text-[13px] leading-relaxed mb-3">{t("brandDesc")}</p>
          <p className="font-[family-name:var(--font-amiri)] text-gold-light text-[16px]" lang="ar" dir="rtl">
            قماشكِ… على مقاسكِ
          </p>
        </div>

        {/* Client care */}
        <nav aria-labelledby="ft-care">
          <h2 id="ft-care" className="th-caps font-[family-name:var(--font-cinzel)] text-[11px] font-semibold tracking-[0.2em] text-gold-light mb-3">
            {t("clientCare")}
          </h2>
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            {care.map((c) => (
              <li key={c.key}>
                {c.href ? (
                  <Link href={c.href} className={linkClass}>
                    {t(c.key)}
                  </Link>
                ) : (
                  <button type="button" onClick={c.action} className={linkClass}>
                    {t(c.key)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal */}
        <nav aria-labelledby="ft-legal">
          <h2 id="ft-legal" className="th-caps font-[family-name:var(--font-cinzel)] text-[11px] font-semibold tracking-[0.2em] text-gold-light mb-3">
            {t("legalPolicies")}
          </h2>
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            {legal.map((key) => (
              <li key={key}>
                <Link href={`/policies/${key}`} className={linkClass}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Join the circle */}
        <div>
          <h2 className="th-caps font-[family-name:var(--font-cinzel)] text-[11px] font-semibold tracking-[0.2em] text-gold-light mb-3">
            {t("joinCircle")}
          </h2>
          <p className="text-[13px] mb-3 leading-relaxed">{t("joinDesc")}</p>
          {join && (
            <a
              href={join}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center rounded-full bg-rani px-5 text-[14px] font-medium text-white no-underline transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
            >
              {t("joinBtn")}
            </a>
          )}
          <p className="text-[12px] mt-2 text-[#9FB5AB]">{t("joinNote")}</p>
        </div>
      </div>

      {/* Legal strip */}
      <div className="border-t border-gold/20">
        <div className="max-w-[1320px] mx-auto px-4 py-4 flex flex-wrap justify-between gap-3 text-[12px] text-[#9FB5AB]">
          <p className="m-0">
            {t("copyright", { year })}
            {address && (
              <>
                {" · "}
                <bdi>{address}</bdi>
              </>
            )}
            {legalName && (
              <>
                {" · "}
                {t("operatedBy")} <bdi>{legalName}</bdi> ({t("entity")})
              </>
            )}
            {nationalNo && (
              <>
                {" · "}
                {t("nationalNo")} <bdi dir="ltr">{nationalNo}</bdi>
              </>
            )}
            {vat && (
              <>
                {" · "}
                {t("vatNo")} <bdi dir="ltr">{vat}</bdi>
              </>
            )}
            {info.vatPct > 0 && (
              <>
                {" · "}
                {t("vatIncluded")}
              </>
            )}
            {" · "}
            {t("photosNote")}
          </p>
          {info.social.length > 0 && (
            <ul className="m-0 flex list-none gap-4 p-0" aria-label={t("social")}>
              {info.social.map((s) => (
                <li key={s.key}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#E7EEEA] no-underline transition-colors hover:text-gold-light">
                    {SOCIAL_LABEL[s.key]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
