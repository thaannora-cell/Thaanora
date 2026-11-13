// Line icons from the prototype's back office.
const PATHS: Record<string, React.ReactNode> = {
  dash: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  prod: (
    <>
      <path d="M6 3 V21 M10 3 V21 M14 3 V21 M18 3 V21" />
      <path d="M3 3 H21" />
    </>
  ),
  stock: (
    <>
      <path d="M3 7 L12 3 L21 7 L12 11 Z" />
      <path d="M3 7 V17 L12 21 L21 17 V7" />
      <path d="M12 11 V21" />
    </>
  ),
  ord: (
    <>
      <path d="M5 8 H19 L18 21 H6 Z" />
      <path d="M9 10 V6 A3 3 0 0 1 15 6 V10" />
    </>
  ),
  off: (
    <>
      <path d="M3 12 V4 H11 L20 13 L13 20 Z" />
      <circle cx="7.5" cy="8.5" r="1.4" />
    </>
  ),
  sea: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10 H21 M8 3 V7 M16 3 V7" />
    </>
  ),
  bell: (
    <>
      <path d="M6 17 V11 A6 6 0 0 1 18 11 V17 L19.5 18.5 H4.5 Z" />
      <path d="M10 21 A2 2 0 0 0 14 21" />
    </>
  ),
  req: <path d="M20 11.5 A8 8 0 0 1 8.2 18.6 L4 20 L5.4 16 A8 8 0 1 1 20 11.5Z" />,
  ret: (
    <>
      <path d="M4 9 H16 A4 4 0 0 1 16 17 H9" />
      <path d="M8 5 L4 9 L8 13" />
    </>
  ),
  rev: <path d="M12 3.5 L14.3 8.6 L19.8 9.2 L15.7 12.9 L16.8 18.4 L12 15.6 L7.2 18.4 L8.3 12.9 L4.2 9.2 L9.7 8.6 Z" />,
  tai: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 7.5 L20 17 M8 16.5 L20 7" />
    </>
  ),
  set: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" />
    </>
  ),
  rep: <path d="M4 20 V10 M10 20 V4 M16 20 V13 M22 20 H2" />,
  staff: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20 C3.5 15 14.5 15 15.5 20" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.5 C19 14.5 21 16 21.5 19" />
    </>
  ),
  site: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21 M12 3 C15 6 15 18 12 21 C9 18 9 6 12 3" />
    </>
  ),
  out: (
    <>
      <path d="M10 4 H5 V20 H10" />
      <path d="M14 8 L18 12 L14 16 M18 12 H9" />
    </>
  ),
};

export default function AdminIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      {PATHS[name]}
    </svg>
  );
}
