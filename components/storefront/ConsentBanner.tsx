"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CONSENT_OPEN, anyEnabled, loadProviders, readConsent, saveConsent } from "@/lib/analytics";

// PDPL consent: analytics and ad pixels load only after she taps Accept. Reject keeps them off.
// "Cookie settings" in the footer shows this again. Hidden when no provider is configured.
export default function ConsentBanner() {
  const t = useTranslations("Consent");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!anyEnabled()) return;
    const choice = readConsent();
    if (choice === "granted") loadProviders();
    // First visit: ask. Shown after the page settles so it never blocks the first paint.
    const first = choice === null ? window.setTimeout(() => setShow(true), 600) : 0;
    const reopen = () => setShow(true);
    window.addEventListener(CONSENT_OPEN, reopen);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener(CONSENT_OPEN, reopen);
    };
  }, []);

  if (!show) return null;
  const accept = () => {
    saveConsent("granted");
    loadProviders();
    setShow(false);
  };
  const reject = () => {
    const wasOn = readConsent() === "granted";
    saveConsent("denied");
    setShow(false);
    if (wasOn) window.location.reload(); // stop scripts that are already running
  };

  return (
    <section
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-text"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[560px] rounded-[20px] border border-gold/50 bg-ivory-white p-4 shadow-[0_18px_40px_rgba(8,42,32,0.25)] md:inset-x-auto md:end-5 md:bottom-5"
    >
      <h2 id="consent-title" className="m-0 text-[15px] font-semibold text-emerald">
        {t("title")}
      </h2>
      <p id="consent-text" className="m-0 mt-1 text-[13px] leading-relaxed text-ink">
        {t("text")}{" "}
        <Link href="/policies/privacy" className="text-emerald underline underline-offset-2">
          {t("more")}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={accept} className="th-btn min-h-[42px] flex-1 border-emerald bg-emerald py-2 text-ivory-white">
          {t("accept")}
        </button>
        <button type="button" onClick={reject} className="th-btn min-h-[42px] flex-1 py-2">
          {t("reject")}
        </button>
      </div>
    </section>
  );
}

// Footer link: open the choice again.
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("Consent");
  if (!anyEnabled()) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN))} className={className}>
      {t("settings")}
    </button>
  );
}
