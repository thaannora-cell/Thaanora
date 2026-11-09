import TopBar from "@/components/storefront/TopBar";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import Hero from "@/components/storefront/Hero";
import ShopBrowser from "@/components/storefront/ShopBrowser";
import SelectionProvider from "@/components/storefront/selection/SelectionProvider";
import SelectionTray from "@/components/storefront/selection/SelectionTray";
import SelectionDrawer from "@/components/storefront/selection/SelectionDrawer";
import { getVisibleProducts } from "@/lib/products";
import { getBrandOfMonth } from "@/lib/campaigns";
import { getBundleRule } from "@/lib/offers";
import { brandsOf } from "@/lib/filters";
import { getCheckoutSettings, getTailors } from "@/lib/shop-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [result, brandOfMonth, tailors, settings, bundle] = await Promise.all([
    getVisibleProducts(),
    getBrandOfMonth(),
    getTailors(),
    getCheckoutSettings(),
    getBundleRule(),
  ]);
  const products = result.status === "ok" ? result.products : [];
  const loaded = result.status === "ok";

  return (
    <SelectionProvider products={products} bundle={bundle} settings={settings}>
      <TopBar />
      <Header />
      <main className="max-w-[1320px] mx-auto px-4 pb-16 min-h-[60vh]">
        <Hero designs={loaded ? products.length : null} brands={loaded ? brandsOf(products).length : null} />
        <ShopBrowser products={products} brandOfMonth={brandOfMonth} loadFailed={!loaded} tailors={tailors} areas={settings.areas.map((a) => a.area)} />
      </main>
      <Footer />
      <SelectionTray />
      <SelectionDrawer />
    </SelectionProvider>
  );
}
