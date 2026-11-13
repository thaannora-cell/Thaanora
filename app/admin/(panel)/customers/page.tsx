import Link from "next/link";
import { redirect } from "next/navigation";
import SectionDenied from "@/components/admin/SectionDenied";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";
import { canOpen } from "@/lib/admin/sections";
import { orderTime } from "@/lib/admin/format";
import { CUSTOMER_TAGS, isTag, listCustomers } from "@/lib/admin/customers";
import { TAG_TONE } from "@/components/admin/customers/tone";

export const dynamic = "force-dynamic";

const chip =
  "inline-flex min-h-[36px] items-center whitespace-nowrap rounded-full border border-[#DDD3C0] bg-white px-3 text-[13px] text-emerald no-underline aria-[current=page]:border-emerald aria-[current=page]:bg-emerald aria-[current=page]:text-white";
const field = "min-h-[40px] rounded-full border border-[#DDD3C0] bg-white px-3 text-[14px]";
const LEVELS = ["silver", "gold", "emerald", "none"] as const;
const SORTS = ["recent", "spent", "orders"] as const;

type SP = { q?: string; tag?: string; level?: string; sort?: string };

// Customers with an account: search, filter by tag or Circle level, sort by last order / spent / orders.
export default async function CustomersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession();
  if (session.state !== "staff") redirect("/admin/sign-in");
  if (!canOpen(session.staff.role, "customers")) return <SectionDenied role={session.staff.role} section="customers" />;
  const sp = await searchParams;
  const tag = isTag(sp.tag) ? sp.tag : null;
  const level = (LEVELS as readonly string[]).includes(sp.level ?? "") ? sp.level! : null;
  const sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as (typeof SORTS)[number]) : "recent";
  const q = (sp.q ?? "").slice(0, 60);
  const [data, t, lang] = [await listCustomers({ q, tag, level, sort }), await getAdminT(), await getAdminLang()];
  const sar = (n: number) => t("money", { amount: n });
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const next = { q, tag: tag ?? undefined, level: level ?? undefined, sort, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "sort" && v === "recent")) p.set(k, v);
    const s = p.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("customers.title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("customers.sub", { count: data.total })}</p>
      </div>

      <form className="mb-3 flex flex-wrap items-center gap-2" action="/admin/customers">
        <input name="q" defaultValue={q} placeholder={t("customers.search")} aria-label={t("customers.search")} className={`${field} min-w-[220px] flex-1`} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        {level && <input type="hidden" name="level" value={level} />}
        <select name="sort" defaultValue={sort} aria-label={t("customers.sortLabel")} className={field}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`customers.sort.${s}`)}
            </option>
          ))}
        </select>
        <button type="submit" className="min-h-[40px] rounded-full bg-emerald px-4 text-[14px] text-white">
          {t("customers.go")}
        </button>
      </form>

      <nav aria-label={t("customers.filters")} className="-mx-4 mb-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="m-0 flex list-none gap-1.5 p-0 md:flex-wrap">
          <li>
            <Link href={href({ tag: undefined, level: undefined })} aria-current={!tag && !level ? "page" : undefined} className={chip}>
              {t("customers.all")}
            </Link>
          </li>
          {CUSTOMER_TAGS.map((x) => (
            <li key={x}>
              <Link href={href({ tag: tag === x ? undefined : x })} aria-current={tag === x ? "page" : undefined} className={chip}>
                {t(`customers.tag.${x}`)}
              </Link>
            </li>
          ))}
          {LEVELS.map((x) => (
            <li key={x}>
              <Link href={href({ level: level === x ? undefined : x })} aria-current={level === x ? "page" : undefined} className={chip}>
                {t(`customers.level.${x}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {data.failed && (
        <p role="alert" className="mb-4 rounded-xl border border-rani/30 bg-[#FBE7EE] px-3 py-2.5 text-[14px] text-rani">
          {t("dashboard.loadFailed")}
        </p>
      )}
      <section className="min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-3 shadow-[0_6px_18px_rgba(14,59,46,0.05)] md:p-[18px]">
        {data.customers.length === 0 ? (
          <p className="m-0 p-2 text-[14px] text-muted">{t("customers.none")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {data.customers.map((c) => (
              <li key={c.id} className="border-b border-[#F0EBE1] last:border-b-0">
                <Link href={`/admin/customers/${c.id}`} className="flex flex-wrap items-start justify-between gap-3 py-3 text-[14px] text-ink no-underline hover:bg-[#FAF8F3]">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <bdi className="font-medium text-emerald">{c.name}</bdi>
                      {c.tags.map((x) => (
                        <span key={x} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TAG_TONE[x]}`}>
                          {t(`customers.tag.${x}`)}
                        </span>
                      ))}
                      {c.status === "deactivated" && <span className="rounded-full bg-[#F1EEE8] px-2 py-0.5 text-[11px] text-muted">{t("customers.deactivated")}</span>}
                    </span>
                    <small className="block text-muted">
                      <bdi dir="ltr">{c.phone}</bdi>
                      {c.email && (
                        <>
                          {" · "}
                          <bdi dir="ltr">{c.email}</bdi>
                        </>
                      )}
                    </small>
                    <small className="block text-muted">
                      {c.lastOrderAt ? t("customers.lastOrder", { time: orderTime(lang, c.lastOrderAt) }) : t("customers.noOrders")}
                    </small>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-[13px] tabular-nums">
                    <b className="font-medium text-emerald">{sar(c.spent)}</b>
                    <span className="text-muted">{t("customers.ordersCount", { count: c.orders })}</span>
                    <span className="text-gold-ink">{c.level ? t(`customers.level.${c.level as "silver" | "gold" | "emerald"}`) : t("customers.level.none")}</span>
                    {c.refusals > 0 && <span className="text-rani">{t("customers.refusals", { count: c.refusals })}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
