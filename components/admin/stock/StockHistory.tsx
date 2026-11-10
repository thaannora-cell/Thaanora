import { getAdminT } from "@/lib/admin/i18n";
import type { AdminLang } from "@/lib/admin/i18n";
import type { Movement, StockRow } from "@/lib/admin/stock";
import { orderTime } from "@/lib/admin/format";

const panel = "mt-4 min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const td = "border-b border-[#F0EBE1] px-2 py-2.5 align-top";

// Every stock change, newest first: when, which suit, how many, why, and who.
// The suit filter is a plain GET form, so it works without JavaScript.
export default async function StockHistory({ history, products, suit, lang }: { history: Movement[]; products: StockRow[]; suit: string; lang: AdminLang }) {
  const t = await getAdminT();

  // Notes are saved in English by the system; known ones are shown in the reader's language.
  const why = (m: Movement) => {
    const note = m.note ?? "";
    let detail: string | null = null;
    if (/^shipment\b/i.test(note)) {
      const ref = note.replace(/^shipment\s*/i, "");
      detail = ref ? t("stock.shipmentRef", { ref }) : null;
    } else if (note === "Opening stock") detail = t("stock.noteOpening");
    else if (note === "Edited in Products") detail = t("stock.noteProducts");
    else if (/by hand$/.test(note)) detail = null;
    else if (note) detail = note; // e.g. the order number for sales and returns
    return (
      <>
        {t(`stock.reasons.${m.reason}`)}
        {detail && (
          <small className="block text-muted">
            <bdi dir="ltr">{detail}</bdi>
          </small>
        )}
      </>
    );
  };
  const change = (d: number) => (
    <b className={`tabular-nums ${d > 0 ? "text-[#1E6B43]" : "text-rani"}`} dir="ltr">
      {d > 0 ? `+${d}` : `−${Math.abs(d)}`}
    </b>
  );
  const who = (m: Movement) => (m.who ? <bdi>{m.who}</bdi> : <span className="text-muted">{t("stock.system")}</span>);

  return (
    <section aria-labelledby="history" className={panel}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 id="history" className="m-0 text-[16px] font-semibold text-emerald">
          {t("stock.history")} <small className="font-normal text-muted">· {t("stock.historyHint")}</small>
        </h2>
        <form method="get" className="flex w-full gap-2 sm:ms-auto sm:w-auto">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("stock.filter")}</span>
            <select name="suit" defaultValue={suit} className="min-h-[40px] w-full min-w-0 rounded-full border border-[#DDD3C0] bg-white px-3 text-[14px] sm:w-[260px]">
              <option value="">{t("stock.allSuits")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} · {p.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-[40px] shrink-0 rounded-full border border-[#CFC3AA] bg-white px-4 text-[14px] font-medium text-emerald">
            {t("stock.show")}
          </button>
        </form>
      </div>

      {history.length === 0 ? (
        <p className="m-0 text-[14px] text-muted">{t("stock.noHistory")}</p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col p-0 md:hidden">
            {history.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 border-b border-[#F0EBE1] py-2.5 text-[14px] last:border-b-0">
                <span className="min-w-0">
                  <b className="block font-medium text-emerald">
                    <bdi>{m.product}</bdi>
                  </b>
                  <span className="block">{why(m)}</span>
                  <small className="block text-muted">
                    {orderTime(lang, m.at)} · {who(m)}
                  </small>
                </span>
                <span className="shrink-0 text-[16px]">{change(m.delta)}</span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  {(["colWhen", "colSuit", "colChange", "colWhy", "colWho"] as const).map((c) => (
                    <th key={c} className="th-caps whitespace-nowrap border-b border-[#E7E1D4] px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-ink">
                      {t(`stock.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="hover:bg-[#FAF8F3]">
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{orderTime(lang, m.at)}</td>
                    <td className={td}>
                      <bdi>{m.product}</bdi> <small className="text-muted">· <bdi dir="ltr">{m.code}</bdi></small>
                    </td>
                    <td className={td}>{change(m.delta)}</td>
                    <td className={td}>{why(m)}</td>
                    <td className={td}>{who(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length >= 100 && <p className="m-0 mt-2 text-[12px] text-muted">{t("stock.latest100")}</p>}
        </>
      )}
    </section>
  );
}
