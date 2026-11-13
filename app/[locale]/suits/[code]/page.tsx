import type { Metadata } from "next";
import Image from "next/image";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageShell from "@/components/storefront/PageShell";
import { getVisibleProducts } from "@/lib/products";
import { getLiveCampaigns } from "@/lib/campaigns";
import { getSiteInfo } from "@/lib/shop-data";
import { publishedReviews } from "@/lib/customer/reviews";
import { photoUrl, salePrice, stockState, type PublicProduct } from "@/lib/product";
import { feelKey } from "@/lib/fabric-feel";
import { OG_LOCALE, jsonLd, languageLinks, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic"; // today's price, stock and her account badge

type Props = { params: Promise<{ locale: string; code: string }> };

const CODE = /^[A-Za-z0-9_-]{1,64}$/;

// Every visible suit, read once per request (metadata and page share it).
const allSuits = cache(async () => {
  const result = await getVisibleProducts(await getLiveCampaigns());
  return result.status === "ok" ? result.products : [];
});
const findSuit = async (code: string) => (CODE.test(code) ? (await allSuits()).find((p) => p.code === code) ?? null : null);
const photosOf = (p: PublicProduct) => [...p.product_images].sort((a, b) => a.sort_order - b.sort_order);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code: raw } = await params;
  const code = decodeURIComponent(raw);
  const p = await findSuit(code);
  if (!p) return { title: "Thaanora", robots: { index: false } };
  const [t, tRack] = await Promise.all([getTranslations({ locale, namespace: "Suit" }), getTranslations({ locale, namespace: "Rack" })]);
  const price = tRack("price", { amount: salePrice(p) });
  const title = t("metaTitle", { name: p.name, brand: p.brand });
  const description = t("metaDescription", { name: p.name, brand: p.brand, fabric: p.fabric, price });
  const photo = photosOf(p)[0];
  const path = `/suits/${encodeURIComponent(p.code)}`;
  return {
    title,
    description,
    alternates: languageLinks(locale, path),
    openGraph: {
      type: "website",
      siteName: "Thaanora · ثانورا",
      title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
      ...(photo ? { images: [{ url: photoUrl(photo.storage_path), alt: photo.alt ?? `${p.brand} — ${p.name}` }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// A suit's own page: what search engines index and what people share. "Choose this suit" opens it in the
// shop (rack or pop-up) where she adds it to her bag.
export default async function SuitPage({ params }: Props) {
  const { locale, code: raw } = await params;
  setRequestLocale(locale);
  const code = decodeURIComponent(raw);
  const p = await findSuit(code);
  if (!p) notFound();

  const [t, tPanel, tRack, tHome, reviews, info] = await Promise.all([
    getTranslations("Suit"),
    getTranslations("Panel"),
    getTranslations("Rack"),
    getTranslations("Home"),
    publishedReviews(p.code, 10),
    getSiteInfo(),
  ]);
  const photos = photosOf(p);
  const price = salePrice(p);
  const stock = stockState(p.stock);
  const related = (await allSuits()).filter((x) => x.code !== p.code && x.brand === p.brand && x.stock > 0).slice(0, 4);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const base = siteUrl();
  const url = `${base}/${locale}/suits/${encodeURIComponent(p.code)}`;
  const wa = info.whatsapp ? `https://wa.me/${info.whatsapp}?text=${encodeURIComponent(t("askText", { name: p.name, code: p.code, url }))}` : null;

  // Product data for search engines (price in SAR, stock, stars from published reviews).
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.code,
    brand: { "@type": "Brand", name: p.brand },
    category: t("category"),
    material: p.fabric,
    color: p.colour_family,
    image: photos.map((ph) => photoUrl(ph.storage_path)),
    description: t("metaDescription", { name: p.name, brand: p.brand, fabric: p.fabric, price: tRack("price", { amount: price }) }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "SAR",
      price: price.toFixed(2),
      availability: stock === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Thaanora" },
      areaServed: { "@type": "City", name: "Riyadh" },
    },
    ...(reviews.length
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: reviews.length, bestRating: 5, worstRating: 1 },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.author },
            datePublished: r.createdAt.slice(0, 10),
            ...(r.body ? { reviewBody: r.body } : {}),
          })),
        }
      : {}),
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Thaanora", item: `${base}/${locale}` },
      { "@type": "ListItem", position: 2, name: p.name, item: url },
    ],
  };

  const rows: [string, React.ReactNode][] = [
    [tPanel("dFabric"), <><bdi>{p.fabric}</bdi> · {p.work === "Printed" ? tRack("workPrinted") : tRack("workEmbroidered")}</>],
    [tPanel("dFeel"), tPanel(`feel.${feelKey(p.fabric)}`)],
    [tPanel("dPieces"), tPanel("piecesValue", { shirt: Number(p.shirt_m), dupatta: Number(p.dupatta_m), trouser: Number(p.trouser_m) })],
    [tPanel("dGoodFor"), p.occasions.map((o) => tHome(`o_${o}`)).join(tPanel("listSep"))],
    [tPanel("dCare"), tPanel("careValue")],
    [tPanel("dColour"), tPanel("colourValue")],
    [tPanel("dStock"), stock === "out" ? tPanel("stockOutValue") : tPanel("stockValue", { n: p.stock })],
  ];

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <nav aria-label={t("breadcrumb")} className="mb-3 text-[13px] text-muted">
        <Link href="/" className="text-emerald underline underline-offset-2">
          {t("home")}
        </Link>
        <span aria-hidden="true"> › </span>
        <bdi>{p.brand}</bdi>
      </nav>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1fr] md:gap-10">
        <div className="grid grid-cols-2 gap-2.5">
          {photos.length ? (
            photos.map((ph, i) => (
              <div key={ph.storage_path} className={`relative overflow-hidden rounded-[18px] bg-ivory ${i === 0 ? "col-span-2 aspect-[4/5]" : "aspect-[3/4]"}`}>
                <Image
                  src={photoUrl(ph.storage_path)}
                  alt={ph.alt ?? `${p.brand} — ${p.name}`}
                  fill
                  priority={i === 0}
                  sizes={i === 0 ? "(max-width: 768px) 100vw, 560px" : "(max-width: 768px) 50vw, 280px"}
                  className="object-cover object-[center_20%]"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 aspect-[4/5] rounded-[18px]" style={{ background: p.colour_hex }} />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="th-caps m-0 font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.16em] text-gold-ink">
              {p.brand} · <span dir="ltr">{p.code}</span>
            </p>
            <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[40px]">{p.name}</h1>
            {reviews.length > 0 && (
              <p className="m-0 mt-1 text-[14px] text-gold-ink">
                {"★".repeat(Math.round(avg))}
                <span className="text-[#E3D9C6]">{"★".repeat(5 - Math.round(avg))}</span> <span className="text-ink">{tPanel("reviewsSummary", { rating: avg.toFixed(1), count: reviews.length })}</span>
              </p>
            )}
          </div>
          <p className="m-0 text-[22px]">
            {p.sale_pct > 0 && <s className="me-2 text-[16px] text-muted">{tRack("price", { amount: Number(p.price_sar) })}</s>}
            <b className={p.sale_pct > 0 ? "text-rani" : "text-emerald"}>{tRack("price", { amount: price })}</b>
            {info.vatPct > 0 && <small className="ms-2 text-[13px] text-muted">{t("inclVat", { pct: info.vatPct })}</small>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/?p=${encodeURIComponent(p.code)}`} className="th-btn th-btn-pink no-underline">
              {stock === "out" ? t("notifyMe") : t("choose")}
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="th-btn no-underline">
                {t("ask")}
              </a>
            )}
          </div>
          <p className="m-0 rounded-xl border border-[#BFDCCB] bg-[#E7F3EC] px-3 py-2.5 text-[13px] text-[#1d3a2d]">{t("codLine")}</p>

          <table className="w-full border-collapse text-[14px]">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-b border-line align-top">
                  <th scope="row" className="w-[38%] py-2 pe-3 text-start font-normal text-muted">
                    {k}
                  </th>
                  <td className="py-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 text-[13px] text-muted">
            {t("returnsLine")}{" "}
            <Link href="/policies/returns" className="text-emerald underline underline-offset-2">
              {t("returnsLink")}
            </Link>
          </p>
        </div>
      </div>

      <section aria-labelledby="reviews" className="mt-10">
        <h2 id="reviews" className="m-0 mb-3 font-[family-name:var(--font-cormorant)] text-[26px] font-semibold text-emerald">
          {tPanel("reviews")}
        </h2>
        {reviews.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">{tPanel("noReviews")}</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-[14px] border border-line bg-white px-4 py-3 text-[14px]">
                <p className="m-0 text-gold-ink">
                  {"★".repeat(r.rating)}
                  <span className="text-[#E3D9C6]">{"★".repeat(5 - r.rating)}</span> <small className="text-muted">· <bdi>{r.author}</bdi> · {tPanel("verifiedBuyer")}</small>
                </p>
                {r.body && (
                  <p lang={r.language} className="mb-0 mt-1">
                    <bdi>{r.body}</bdi>
                  </p>
                )}
                {r.reply && (
                  <p className="mb-0 mt-2 border-s-2 border-gold ps-3 text-[13px] text-muted">
                    <b className="font-medium text-emerald">{tPanel("ourReply")}</b> <bdi>{r.reply}</bdi>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="more" className="mt-10">
          <h2 id="more" className="m-0 mb-3 font-[family-name:var(--font-cormorant)] text-[26px] font-semibold text-emerald">
            {t("moreFrom", { brand: p.brand })}
          </h2>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
            {related.map((x) => {
              const ph = photosOf(x)[0];
              return (
                <li key={x.code}>
                  <Link href={`/suits/${encodeURIComponent(x.code)}`} className="th-lift flex h-full flex-col overflow-hidden rounded-[16px] border border-line bg-ivory-white no-underline">
                    <span className="relative block aspect-[3/4] w-full" style={{ background: x.colour_hex }}>
                      {ph && <Image src={photoUrl(ph.storage_path)} alt={ph.alt ?? `${x.brand} — ${x.name}`} fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover object-[center_20%]" />}
                    </span>
                    <span className="flex flex-col gap-0.5 p-3">
                      <span className="line-clamp-2 text-[14px] font-medium leading-snug text-emerald">{x.name}</span>
                      <span className="text-[14px] text-ink">{tRack("price", { amount: salePrice(x) })}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
