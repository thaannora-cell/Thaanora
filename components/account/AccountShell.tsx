import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import WhatsAppHelp from "@/components/storefront/WhatsAppHelp";
import { getSiteInfo } from "@/lib/shop-data";
import { accountBadge } from "@/lib/customer/account";

// Frame for every My Thaanora page: the site header (with the account badge), a narrow column, the footer.
export default async function AccountShell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  const [info, account] = await Promise.all([getSiteInfo(), accountBadge()]);
  return (
    <>
      <Header minimal account={account} />
      <main className={`mx-auto px-4 pb-16 pt-6 md:pt-10 ${narrow ? "max-w-[460px]" : "max-w-[880px]"}`}>{children}</main>
      <Footer info={info} />
      <WhatsAppHelp whatsapp={info.whatsapp} />
    </>
  );
}

// The ivory card used across My Thaanora.
export function Card({ children, className = "", labelledBy }: { children: React.ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className={`rounded-[22px] border border-line bg-ivory-white p-5 shadow-[0_8px_24px_rgba(14,59,46,0.06)] md:p-6 ${className}`}>
      {children}
    </section>
  );
}
