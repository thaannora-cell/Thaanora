// The four policy pages. Text lives in messages under "Policies.<slug>".
export const POLICIES = ["returns", "delivery", "privacy", "terms"] as const;
export type PolicySlug = (typeof POLICIES)[number];
export const isPolicy = (s: string): s is PolicySlug => (POLICIES as readonly string[]).includes(s);
