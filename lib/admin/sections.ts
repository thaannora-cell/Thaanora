// Back-office sections and which roles may open them. The database (RLS) enforces the same split;
// this list decides what the server renders and what the sidebar shows.
export type StaffRole = "owner" | "orders" | "catalogue";

export const SECTIONS = [
  { key: "dashboard", icon: "dash", roles: ["owner", "orders", "catalogue"] },
  { key: "orders", icon: "ord", roles: ["owner", "orders"] },
  { key: "customers", icon: "cust", roles: ["owner", "orders"] },
  { key: "products", icon: "prod", roles: ["owner", "catalogue"] },
  { key: "stock", icon: "stock", roles: ["owner", "catalogue"] },
  { key: "offers", icon: "off", roles: ["owner"] },
  { key: "outreach", icon: "send", roles: ["owner"] },
  { key: "loyalty", icon: "circle", roles: ["owner"] },
  { key: "picks", icon: "rev", roles: ["owner", "catalogue"] },
  { key: "seasons", icon: "sea", roles: ["owner"] },
  { key: "requests", icon: "req", roles: ["owner", "orders"] },
  { key: "returns", icon: "ret", roles: ["owner", "orders"] },
  { key: "reviews", icon: "rev", roles: ["owner", "catalogue"] },
  { key: "notifications", icon: "bell", roles: ["owner", "orders"] },
  { key: "tailors", icon: "tai", roles: ["owner"] },
  { key: "reports", icon: "rep", roles: ["owner"] },
  { key: "settings", icon: "set", roles: ["owner"] },
  { key: "staff", icon: "staff", roles: ["owner"] },
] as const satisfies readonly { key: string; icon: string; roles: readonly StaffRole[] }[];

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const sectionHref = (key: SectionKey) => (key === "dashboard" ? "/admin" : `/admin/${key}`);
export const isSection = (s: string): s is SectionKey => SECTIONS.some((x) => x.key === s);
export const canOpen = (role: StaffRole, key: SectionKey) =>
  (SECTIONS.find((s) => s.key === key)?.roles as readonly StaffRole[] | undefined)?.includes(role) ?? false;
export const sectionsFor = (role: StaffRole) => SECTIONS.filter((s) => (s.roles as readonly StaffRole[]).includes(role));
