import "server-only";
import { getTranslations } from "next-intl/server";
import { getSessionClient } from "@/lib/supabase/server";
import { refOf } from "@/lib/request-ref";

export const REQUEST_TYPES = ["sourcing", "notify_me", "preorder", "stitching"] as const;
export const REQUEST_STATUSES = ["new", "in_progress", "done", "closed"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const isType = (s: string): s is RequestType => (REQUEST_TYPES as readonly string[]).includes(s);
export const isReqStatus = (s: string): s is RequestStatus => (REQUEST_STATUSES as readonly string[]).includes(s);

export type RequestRow = {
  id: string;
  ref: string;
  type: RequestType;
  status: RequestStatus;
  customer: string;
  phone: string;
  area: string | null;
  what: string; // product (notify / pre-order) or the brand / description (sourcing)
  brand: string | null;
  link: string | null;
  quantity: number | null;
  language: "en" | "ar" | "ur" | "hi";
  createdAt: string;
  updatedAt: string;
  hasScreenshot: boolean;
};

const COLUMNS = "id, type, status, customer_name, customer_phone, area, details, brand, reference, quantity, screenshot_path, language, created_at, updated_at";
type Raw = Record<string, unknown>;
const toRow = (r: Raw): RequestRow => ({
  id: r.id as string,
  ref: refOf(r.id as string),
  type: r.type as RequestType,
  status: r.status as RequestStatus,
  customer: (r.customer_name as string) || "—",
  phone: r.customer_phone as string,
  area: (r.area as string | null) ?? null,
  what: (r.details as string) || (r.brand as string) || "—",
  brand: (r.brand as string | null) ?? null,
  link: (r.reference as string | null) ?? null,
  quantity: (r.quantity as number | null) ?? null,
  language: ((r.language as string) || "en") as RequestRow["language"],
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
  hasScreenshot: Boolean(r.screenshot_path),
});

// Read as the signed-in person (RLS: owner and orders team).
export async function listRequests(type: RequestType | null, status: RequestStatus | null) {
  const supabase = await getSessionClient();
  let q = supabase.from("requests").select(COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (type) q = q.eq("type", type);
  if (status) q = q.eq("status", status);
  const [rows, all] = await Promise.all([q, supabase.from("requests").select("type, status")]);
  const byType = Object.fromEntries(REQUEST_TYPES.map((t) => [t, 0])) as Record<RequestType, number>;
  const byStatus = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
  for (const r of all.data ?? []) {
    byType[r.type as RequestType]++;
    byStatus[r.status as RequestStatus]++;
  }
  return { requests: ((rows.data ?? []) as Raw[]).map(toRow), byType, byStatus, total: all.data?.length ?? 0, failed: Boolean(rows.error || all.error) };
}

// One request, with a 10-minute private link to its screenshot (the bucket has no public links).
export async function getRequest(id: string): Promise<(RequestRow & { screenshotUrl: string | null }) | null> {
  const supabase = await getSessionClient();
  const { data } = await supabase.from("requests").select(COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  let screenshotUrl: string | null = null;
  if (data.screenshot_path) {
    const { data: signed } = await supabase.storage.from("request-screenshots").createSignedUrl(data.screenshot_path, 600);
    screenshotUrl = signed?.signedUrl ?? null;
  }
  return { ...toRow(data), screenshotUrl };
}

// Ready-to-send WhatsApp reply in the customer's language: what's right for this type of request,
// or a polite "we can't get it" once it's Closed. Staff press send themselves.
export type ReplyKind = RequestType | "closed";
export async function requestReply(r: RequestRow): Promise<{ kind: ReplyKind; text: string; url: string; phone: string; values: { name: string; ref: string; what: string } } | null> {
  const t = await getTranslations({ locale: r.language, namespace: "RequestReply" });
  const name = r.customer === "—" ? "" : (r.customer.split(/\s+/)[0] ?? "");
  const what = r.what.replace(/^[^·]+·\s*/, "") || r.what; // "CODE · Name" → "Name"
  const v = { name: name || t("there"), ref: r.ref, what };
  const kind: ReplyKind = r.status === "closed" ? "closed" : r.type;
  const text = [t(kind, v), "", t("signoff")].join("\n");
  const digits = r.phone.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return { kind, text, url: `https://wa.me/${digits}?text=${encodeURIComponent(text)}`, phone: digits, values: v };
}
