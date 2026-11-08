"use client";

export default function TopBar() {
  return (
    <div
      className="bg-emerald text-gold-light text-[13px] py-2"
      role="complementary"
      aria-label="Promotions"
    >
      <div className="max-w-[1320px] mx-auto px-4 flex items-center justify-between gap-4 flex-wrap">
        {/* Left — shipping origin */}
        <span className="flex items-center gap-2">
          {/* Animated paper plane */}
          <svg
            className="shrink-0"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-gold-light)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <g className="mi-bob">
              <path d="M3 13 L21 6 L15 20 L12 14 Z" />
              <path d="M12 14 L21 6" />
            </g>
          </svg>
          Direct from Lahore &amp; Karachi to Riyadh
        </span>

        {/* Centre — rotating promo */}
        <span className="hidden sm:block" aria-live="polite">
          Any 3 suits{" "}
          <strong className="text-rani font-medium">10% off</strong> · Cash on
          delivery in Riyadh
        </span>

        {/* Right — WhatsApp */}
        <span className="flex items-center gap-2">
          <svg
            className="shrink-0"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F3A7C3"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path
              className="mi-bob"
              d="M5 3 H9 L11 8 L8.5 9.5 A11 11 0 0 0 14.5 15.5 L16 13 L21 15 V19 A2 2 0 0 1 19 21 A16 16 0 0 1 3 5 A2 2 0 0 1 5 3Z"
            />
          </svg>
          WhatsApp concierge
        </span>
      </div>
    </div>
  );
}
