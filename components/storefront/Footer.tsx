"use client";

export default function Footer() {
  return (
    <footer className="bg-emerald-deep text-[#9FB5AB] text-[14px] border-t border-gold/20">
      <div className="max-w-[1320px] mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

        {/* Brand column */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            {/* Compact footer medal — no ث */}
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gold text-emerald font-[family-name:var(--font-cinzel)] font-semibold text-[18px] shrink-0"
              aria-hidden="true"
            >
              T
            </span>
            <span className="font-[family-name:var(--font-cinzel)] font-semibold tracking-[0.16em] text-[20px] text-white">
              THAANORA
            </span>
          </div>
          <p className="text-[13px] leading-relaxed mb-3">
            Original Pakistani unstitched suits for women across Riyadh. Every
            order is confirmed on WhatsApp before dispatch.
          </p>
          <p
            className="font-[family-name:var(--font-amiri)] text-gold-light text-[16px]"
            lang="ar"
            dir="rtl"
          >
            قماشكِ… على مقاسكِ
          </p>
        </div>

        {/* Client care */}
        <div>
          <h4 className="font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.2em] text-gold-light mb-3">
            CLIENT CARE
          </h4>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {[
              "Track my order",
              "Tailoring and measurements",
              "Sourcing on request",
              "Delivery and fees",
            ].map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="text-[#9FB5AB] hover:text-gold-light transition-colors text-start bg-transparent border-0 p-0 cursor-pointer"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.2em] text-gold-light mb-3">
            LEGAL &amp; POLICIES
          </h4>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {[
              "Returns and exchanges",
              "Privacy policy (PDPL)",
              "Terms of sale",
            ].map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="text-[#9FB5AB] hover:text-gold-light transition-colors text-start bg-transparent border-0 p-0 cursor-pointer"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Join circle */}
        <div>
          <h4 className="font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.2em] text-gold-light mb-3">
            JOIN THE CIRCLE
          </h4>
          <p className="text-[13px] mb-3 leading-relaxed">
            Unboxing previews, new collections and Eid offers on WhatsApp, about
            twice a month.
          </p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <label className="sr-only" htmlFor="joinTel">
              WhatsApp number
            </label>
            <input
              id="joinTel"
              type="tel"
              inputMode="tel"
              placeholder="05X XXX XXXX"
              className="flex-1 min-w-0 min-h-[46px] rounded-full border border-gold/40 bg-emerald/40 text-white placeholder:text-[#9FB5AB] px-4 font-[family-name:var(--font-jost)] text-[14px] focus:outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="shrink-0 min-h-[46px] px-4 rounded-full bg-rani text-white font-medium text-[14px] hover:-translate-y-0.5 transition-transform"
            >
              Join
            </button>
          </form>
          <p className="text-[12px] mt-2 text-[#9FB5AB]">
            We only message you about Thaanora.
          </p>
        </div>

      </div>

      {/* Legal strip */}
      <div className="border-t border-gold/20">
        <div className="max-w-[1320px] mx-auto px-4 py-4 flex flex-wrap justify-between gap-3 text-[12px] text-[#9FB5AB]">
          <span>
            © 2026 Thaanora · Riyadh, Saudi Arabia · Prices include 15% VAT
          </span>
          <span className="flex gap-4">
            {["Instagram", "TikTok", "Snapchat"].map((s) => (
              <a
                key={s}
                href="#"
                className="hover:text-gold-light transition-colors no-underline"
              >
                {s}
              </a>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
