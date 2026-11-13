import Header from "./Header";
import Footer from "./Footer";
import WhatsAppHelp from "./WhatsAppHelp";
import { getSiteInfo } from "@/lib/shop-data";
import { accountBadge } from "@/lib/customer/account";

// Frame for standalone shop pages (a suit's own page, page not found): header, a column, footer.
export default async function PageShell({ children }: { children: React.ReactNode }) {
  const [info, account] = await Promise.all([getSiteInfo(), accountBadge()]);
  return (
    <>
      <Header minimal account={account} />
      <main className="mx-auto min-h-[50vh] max-w-[1100px] px-4 pb-16 pt-6 md:pt-10">{children}</main>
      <Footer info={info} />
      <WhatsAppHelp whatsapp={info.whatsapp} />
    </>
  );
}
