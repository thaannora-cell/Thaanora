import TopBar from "@/components/storefront/TopBar";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import Hero from "@/components/storefront/Hero";
import ShopBrowser from "@/components/storefront/ShopBrowser";
import { getVisibleProducts } from "@/lib/products";
import { getBrandOfMonth } from "@/lib/campaigns";
import { brandsOf } from "@/lib/filters";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [result, brandOfMonth] = await Promise.all([getVisibleProducts(), getBrandOfMonth()]);
  const products = result.status === "ok" ? result.products : [];
  const loaded = result.status === "ok";

  return (
    <>
      <TopBar />
      <Header />
      <main className="max-w-[1320px] mx-auto px-4 pb-16 min-h-[60vh]">
        <Hero designs={loaded ? products.length : null} brands={loaded ? brandsOf(products).length : null} />
        <ShopBrowser products={products} brandOfMonth={brandOfMonth} loadFailed={!loaded} />
      </main>
      <Footer />
    </>
  );
}
