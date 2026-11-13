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
import { jsonLd, siteUrl } from "@/lib/seo";

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

  // Who we are, for search engines: an online store in Riyadh, its WhatsApp and social profiles.
  const base = siteUrl();
  const store = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "Thaanora",
    alternateName: "ثانورا",
    url: `${base}/${locale}`,
    logo: `${base}/apple-icon`,
    image: `${base}/${locale}/opengraph-image`,
    description: "Original Pakistani unstitched women's suits in Riyadh. Order on WhatsApp, cash on delivery.",
    areaServed: { "@type": "City", name: "Riyadh" },
    address: { "@type": "PostalAddress", addressLocality: "Riyadh", addressCountry: "SA" },
    currenciesAccepted: "SAR",
    paymentAccepted: "Cash on delivery",
    ...(info.business.legalName ? { legalName: info.business.legalName } : {}),
    ...(info.business.vat ? { vatID: info.business.vat } : {}),
    ...(info.whatsapp ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: `+${info.whatsapp}`, availableLanguage: ["Arabic", "English", "Urdu", "Hindi"] } } : {}),
    ...(info.social.length ? { sameAs: info.social.map((x) => x.url) } : {}),
  };

  return (
    <SelectionProvider products={products} bundle={bundle} settings={settings} customer={customer}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(store) }} />
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
