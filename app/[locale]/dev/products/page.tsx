import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import TopBar from "@/components/storefront/TopBar";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import ProductThumb from "@/components/storefront/ProductThumb";
import { getVisibleProducts } from "@/lib/products";
import { salePrice } from "@/lib/product";
import { getSiteInfo } from "@/lib/shop-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DevProductsPage() {
  const t = await getTranslations("DevProducts");
  const tHome = await getTranslations("Home");
  const result = await getVisibleProducts();

  return (
    <>
      <TopBar />
      <Header minimal />
      <main className="max-w-[1320px] mx-auto px-4 py-8 min-h-[60vh]">
        <h1 className="font-[family-name:var(--font-cormorant)] text-[36px] font-semibold text-emerald leading-tight">
          {t("title")}
        </h1>
        <p className="text-muted text-[14px] mt-1 mb-6">{t("subtitle")}</p>

        {result.status === "not_configured" && (
          <p className="rounded-xl border border-gold/60 bg-ivory-white p-4 text-[14px] text-walnut">
            {t("notConfigured")}
          </p>
        )}

        {result.status === "error" && (
          <p className="rounded-xl border border-rani/40 bg-rani/5 p-4 text-[14px] text-rani">
            {t("error")} <code dir="ltr">{result.message}</code>
          </p>
        )}

        {result.status === "ok" && (
          <>
            <p className="text-[13px] text-gold-ink mb-3">
              {t("count", { n: result.products.length })}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
              {result.products.map((p, i) => (
                <li
                  key={p.id}
                  className="flex gap-3 rounded-2xl border border-line bg-ivory-white p-3"
                >
                  <ProductThumb product={p} width={84} priority={i < 3} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] tracking-[0.14em] uppercase text-gold-ink">{p.brand}</p>
                    <p className="text-[15px] text-emerald font-medium leading-snug" dir="auto">{p.name}</p>
                    <p className="text-[12px] text-muted" dir="ltr">{p.code} · {p.fabric}</p>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[14px] tabular-nums">
                      {p.sale_pct > 0 && (
                        <span className="line-through text-muted">SAR {Number(p.price_sar)}</span>
                      )}
                      <span className={p.sale_pct > 0 ? "text-rani font-medium" : "text-emerald font-medium"}>
                        SAR {salePrice(p)}
                      </span>
                      {p.sale_pct > 0 && <span className="text-rani text-[12px]" dir="ltr">−{p.sale_pct}%</span>}
                    </p>
                    <p className={`text-[12px] ${p.stock === 0 ? "text-muted font-medium" : p.stock <= 3 ? "text-rani" : "text-muted"}`}>
                      {p.stock === 0 ? t("soldOut") : t("inStock", { n: p.stock })}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {p.is_new && (
                        <span className="rounded-full bg-gold px-2 text-[11px] text-emerald">{tHome("o_new")}</span>
                      )}
                      {p.trending_rank && (
                        <span className="rounded-full bg-emerald px-2 text-[11px] text-gold-light" dir="ltr">#{p.trending_rank}</span>
                      )}
                      {p.occasions.map((o) => (
                        <span key={o} className="rounded-full border border-line px-2 text-[11px] text-muted">
                          {tHome(`o_${o}`)}
                        </span>
                      ))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <Footer info={await getSiteInfo()} />
    </>
  );
}
