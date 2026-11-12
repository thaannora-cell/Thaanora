import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import FavouriteRemove from "@/components/account/FavouriteRemove";
import { getAccount } from "@/lib/customer/account";
import { favoriteCodes } from "@/lib/customer/favorites";
import { getVisibleProducts } from "@/lib/products";
import { getLiveCampaigns } from "@/lib/campaigns";
import { LOW_STOCK, photoUrl, salePrice } from "@/lib/product";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Favourites" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

// Her saved suits, with today's price and stock (the same list the rack uses).
export default async function FavouritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);

  const [t, tAcc, tRack, codes, result] = await Promise.all([
    getTranslations("Favourites"),
    getTranslations("Account"),
    getTranslations("Rack"),
    favoriteCodes(account.customer.id),
    getLiveCampaigns().then((c) => getVisibleProducts(c)),
  ]);
  const all = result.status === "ok" ? result.products : [];
  const list = (codes ?? []).map((c) => all.find((p) => p.code === c)).filter((p) => p !== undefined);

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px]">{t("title")}</h1>
      <p className="m-0 mb-4 text-[14px] text-muted">{t("intro")}</p>

      {list.length === 0 ? (
        <Card>
          <p className="m-0 mb-3 text-[14px] text-muted">{t("empty")}</p>
          <Link href="/" className="th-btn th-btn-pink no-underline">
            {t("browse")}
          </Link>
        </Card>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {list.map((p) => {
            const photo = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
            const price = salePrice(p);
            return (
              <li key={p.code} className="flex gap-3 rounded-[20px] border border-line bg-ivory-white p-3 shadow-[0_6px_18px_rgba(14,59,46,0.05)]">
                <span className="relative h-[110px] w-[84px] shrink-0 overflow-hidden rounded-xl" style={{ background: p.colour_hex }}>
                  {photo && <Image src={photoUrl(photo.storage_path)} alt="" fill sizes="84px" className="object-cover object-[center_18%]" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <small className="text-[12px] text-gold-ink">{p.brand}</small>
                  <b className="text-[15px] font-medium leading-snug text-emerald">{p.name}</b>
                  <span className="text-[14px]">
                    {p.sale_pct > 0 && <s className="me-1.5 text-muted">{tRack("price", { amount: p.price_sar })}</s>}
                    <span className={p.sale_pct > 0 ? "font-medium text-rani" : ""}>{tRack("price", { amount: price })}</span>
                  </span>
                  <small className={`text-[12px] ${p.stock <= 0 ? "text-rani" : "text-muted"}`}>
                    {p.stock <= 0 ? t("soldOut") : p.stock <= LOW_STOCK ? t("fewLeft", { count: p.stock }) : t("inStock")}
                  </small>
                  <span className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    <Link href={`/?p=${encodeURIComponent(p.code)}`} className="text-[14px] font-medium text-emerald underline underline-offset-2">
                      {t("view")}
                    </Link>
                    <FavouriteRemove code={p.code} />
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
