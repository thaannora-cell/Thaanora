import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "./AccountShell";
import { getVisibleProducts } from "@/lib/products";
import { getLiveCampaigns } from "@/lib/campaigns";
import { forYouCodes, picks } from "@/lib/recommend";
import { photoUrl, salePrice } from "@/lib/product";
import AccountIcon from "@/components/account/AccountIcon";

// My Thaanora overview: up to four suits for her ("For you"), or Our picks while there's nothing to go
// on yet. Each opens the suit in the shop.
export default async function PickedForYou({ customerId, locale }: { customerId: string; locale: string }) {
  const result = await getLiveCampaigns().then((c) => getVisibleProducts(c));
  if (result.status !== "ok") return null;
  const products = result.products;
  const personal = await forYouCodes(customerId, products);
  const codes = (personal.length ? personal : picks(products, locale).map((p) => p.code)).slice(0, 4);
  if (codes.length === 0) return null;
  const list = codes.map((c) => products.find((p) => p.code === c)).filter((p) => p !== undefined);
  const [t, tRack] = await Promise.all([getTranslations("Account"), getTranslations("Rack")]);

  return (
    <Card labelledBy="for-you" className="md:col-span-2">
      <h2 id="for-you" className="m-0 text-[16px] font-semibold text-emerald flex items-center gap-2">
            <AccountIcon name="picks" />
        {personal.length ? t("forYouTitle") : t("ourPicksTitle")}
      </h2>
      <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
        {list.map((p) => {
          const photo = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
          return (
            <li key={p.code}>
              <Link href={`/?p=${encodeURIComponent(p.code)}`} className="th-lift flex flex-col overflow-hidden rounded-[14px] border border-line bg-white no-underline">
                <span className="relative block aspect-[3/4] w-full" style={{ background: p.colour_hex }}>
                  {photo && <Image src={photoUrl(photo.storage_path)} alt="" fill sizes="(max-width: 640px) 45vw, 180px" className="object-cover object-[center_20%]" />}
                </span>
                <span className="flex flex-col gap-0.5 p-2.5">
                  <small className="text-[11px] text-gold-ink">{p.brand}</small>
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug text-emerald">{p.name}</span>
                  <span className={`text-[13px] ${p.sale_pct > 0 ? "font-semibold text-rani" : "text-ink"}`}>{tRack("price", { amount: salePrice(p) })}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
