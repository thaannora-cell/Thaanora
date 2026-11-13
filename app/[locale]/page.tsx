import TopBar from "@/components/storefront/TopBar";
import { accountBadge } from "@/lib/customer/account";
import { checkoutCustomer } from "@/lib/customer/checkout";
import { getAccount } from "@/lib/customer/account";
import { forYouCodes, picks, trendingCodes } from "@/lib/recommend";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import Hero from "@/components/storefront/Hero";
import ShopBrowser from "@/components/storefront/ShopBrowser";
import SelectionProvider from "@/components/storefront/selection/SelectionProvider";
import SelectionTray from "@/components/storefront/selection/SelectionTray";
import SelectionDrawer from "@/components/storefront/selection/SelectionDrawer";
import { getVisibleProducts } from "@/lib/products";
import { getBrandOfMonth, getLiveCampaigns, getTopBarLines } from "@/lib/campaigns";
import { getBundleRule } from "@/lib/offers";
import { brandsOf } from "@/lib/filters";
import { getCheckoutSettings, getSiteInfo, getTailors } from "@/lib/shop-data";
import WhatsAppHelp from "@/components/storefront/WhatsAppHelp";

export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const campaigns = await getLiveCampaigns();
  const [result, brandOfMonth, tailors, settings, bundle, info, topLines, account, customer] = await Promise.all([
    getVisibleProducts(campaigns),
    getBrandOfMonth(),
    getTailors(),
    getCheckoutSettings(),
    getBundleRule(),
    getSiteInfo(),
    getTopBarLines(locale, campaigns),
    accountBadge(),
    checkoutCustomer(),
  ]);
  const products = result.status === "ok" ? result.products : [];
  const loaded = result.status === "ok";
  // Trending in Riyadh, Our picks, and (signed in) For you.
  const account2 = await getAccount();
  const [trending, forYou] = loaded
    ? await Promise.all([trendingCodes(products), account2.state === "customer" ? forYouCodes(account2.customer.id, products) : Promise.resolve([])])
    : [[], []];
  const recommendations = { trending, picks: picks(products, locale), forYou };

  return (
    <SelectionProvider products={products} bundle={bundle} settings={settings} customer={customer}>
      <TopBar lines={topLines} whatsapp={info.whatsapp} />
      <Header account={account} />
      <main className="max-w-[1320px] mx-auto px-4 pb-16 min-h-[60vh]">
        <Hero designs={loaded ? products.length : null} brands={loaded ? brandsOf(products).length : null} />
        <ShopBrowser products={products} brandOfMonth={brandOfMonth} loadFailed={!loaded} tailors={tailors} signedIn={customer !== null} recommendations={recommendations} />
      </main>
      <Footer info={info} onShop />
      <WhatsAppHelp whatsapp={info.whatsapp} aboveTray />
      <SelectionTray />
      <SelectionDrawer />
    </SelectionProvider>
  );
}
