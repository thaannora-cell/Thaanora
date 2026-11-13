// Small animated line icons for My Thaanora (same style as the shop's header icons). Motion stops when
// the visitor asks for reduced motion (globals.css). Decorative only: the text next to them says it all.

export type AccountIconName =
  | "home"
  | "orders"
  | "favourites"
  | "addresses"
  | "tailor"
  | "notifications"
  | "circle"
  | "profile"
  | "birthday"
  | "gift"
  | "offers"
  | "picks"
  | "info"
  | "claim"
  | "signin";

const G = "var(--color-gold)";

function Glyph({ name }: { name: AccountIconName }) {
  switch (name) {
    case "orders":
      return (
        <>
          <g className="mi-drive">
            <path d="M2.5 7.5 H14.5 V15.5 H2.5 Z" />
            <path d="M14.5 9.5 H18.5 L21.5 12.5 V15.5 H14.5" />
            <circle cx="7" cy="16.5" r="1.8" fill="var(--color-ivory-white)" />
            <circle cx="17.5" cy="16.5" r="1.8" fill="var(--color-ivory-white)" />
          </g>
          <path className="mi-road" d="M1 21 H23" stroke={G} />
        </>
      );
    case "favourites":
      return <path className="mi-beat" d="M12 20 C5 15.5 3 12.5 3 9.3 A4.3 4.3 0 0 1 12 7 A4.3 4.3 0 0 1 21 9.3 C21 12.5 19 15.5 12 20 Z" />;
    case "addresses":
      return (
        <>
          <g className="mi-bob">
            <path d="M12 21 C8 16.5 6 13.4 6 10 A6 6 0 0 1 18 10 C18 13.4 16 16.5 12 21 Z" />
            <circle cx="12" cy="10" r="2.2" stroke={G} />
          </g>
          <path d="M8 22 H16" stroke={G} />
        </>
      );
    case "tailor":
      return (
        <>
          <g className="mi-snipA">
            <circle cx="6" cy="18" r="2.6" />
            <path d="M8 16.3 L19 5" />
          </g>
          <g className="mi-snipB">
            <circle cx="18" cy="18" r="2.6" />
            <path d="M16 16.3 L5 5" />
          </g>
          <path d="M3 22 H21" stroke={G} strokeDasharray="1.5 2" />
        </>
      );
    case "notifications":
      return (
        <g className="mi-ring">
          <path d="M6 17 V11 A6 6 0 0 1 18 11 V17 L19.5 18.5 H4.5 Z" />
          <path d="M10 21 A2 2 0 0 0 14 21" />
        </g>
      );
    case "circle":
      return (
        <>
          <path d="M8.5 3 L12 8 L15.5 3" stroke={G} />
          <circle cx="12" cy="14.5" r="6.5" />
          <path d="M10.2 12 H13.8 M12 12 V17.5" />
          <path className="mi-twinkle" d="M19.5 7 L20 8.4 L21.4 8.9 L20 9.4 L19.5 10.8 L19 9.4 L17.6 8.9 L19 8.4Z" stroke={G} strokeWidth="0.8" fill={G} />
        </>
      );
    case "profile":
    case "signin":
      return (
        <>
          <circle cx="12" cy="8.5" r="3.8" />
          <path d="M4.5 20.5 C5.5 16.2 8.4 14.2 12 14.2 C15.6 14.2 18.5 16.2 19.5 20.5" />
          <path className="mi-twinkle" d="M19 3.5 L19.6 5.2 L21.3 5.8 L19.6 6.4 L19 8.1 L18.4 6.4 L16.7 5.8 L18.4 5.2Z" stroke={G} strokeWidth="1" fill={G} />
        </>
      );
    case "birthday":
      return (
        <>
          <path d="M4 21 V14 H20 V21 Z" />
          <path d="M4 17 C6 18.5 8 15.5 10 17 C12 18.5 14 15.5 16 17 C18 18.5 19 16.5 20 17" stroke={G} />
          <path d="M12 14 V10.5" />
          <path className="mi-flicker" d="M12 9.5 C10.6 8.2 11.2 6.6 12 5 C12.8 6.6 13.4 8.2 12 9.5 Z" stroke="var(--color-rani)" fill="var(--color-rani)" fillOpacity="0.25" />
          <path d="M2.5 21 H21.5" />
        </>
      );
    case "gift":
    case "offers":
      return (
        <>
          <path d="M5 11 V20.5 H19 V11" />
          <path d="M12 11 V20.5" stroke={G} />
          <g className="mi-hop">
            <path d="M3.5 7.5 H20.5 V11 H3.5 Z" />
            <path d="M12 7.5 C10.5 4 7 4 7.5 6 C7.8 7.2 10 7.5 12 7.5 C14 7.5 16.2 7.2 16.5 6 C17 4 13.5 4 12 7.5" stroke={G} />
          </g>
        </>
      );
    case "picks":
      return (
        <>
          <path d="M12 3.5 L14.3 8.6 L19.8 9.2 L15.7 12.9 L16.8 18.4 L12 15.6 L7.2 18.4 L8.3 12.9 L4.2 9.2 L9.7 8.6 Z" />
          <path className="mi-twinkle" d="M20 2.5 L20.5 3.9 L21.9 4.4 L20.5 4.9 L20 6.3 L19.5 4.9 L18.1 4.4 L19.5 3.9Z" stroke={G} strokeWidth="0.8" fill={G} />
        </>
      );
    case "claim":
      return (
        <>
          <path d="M6 3.5 H15 L19 7.5 V20.5 H6 Z" />
          <path d="M15 3.5 V7.5 H19" />
          <g className="mi-bob">
            <path d="M9 14 L11.5 16.5 L16 11.5" stroke={G} />
          </g>
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11 V16.5" />
          <circle className="mi-bob" cx="12" cy="7.8" r="0.6" fill="currentColor" stroke={G} />
        </>
      );
    default: // home
      return (
        <>
          <path d="M3.5 11 L12 4 L20.5 11" />
          <path d="M5.5 9.5 V20.5 H18.5 V9.5" />
          <path className="mi-twinkle" d="M12 12 L12.6 13.6 L14.2 14.2 L12.6 14.8 L12 16.4 L11.4 14.8 L9.8 14.2 L11.4 13.6Z" stroke={G} strokeWidth="0.8" fill={G} />
        </>
      );
  }
}

// The icon on its own (inside a pill, next to a card heading).
export default function AccountIcon({ name, size = 20 }: { name: AccountIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-emerald)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <Glyph name={name} />
    </svg>
  );
}

// The icon in a round ivory medal with a gold ring, for page titles.
export function AccountMedal({ name, size = 48 }: { name: AccountIconName; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="th-medal grid shrink-0 place-items-center rounded-full border border-gold bg-ivory-white shadow-[0_6px_16px_rgba(14,59,46,0.10)]"
      style={{ width: size, height: size }}
    >
      <AccountIcon name={name} size={Math.round(size * 0.56)} />
    </span>
  );
}
