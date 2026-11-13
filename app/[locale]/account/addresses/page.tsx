import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AccountShell, { Card } from "@/components/account/AccountShell";
import AddressForm from "@/components/account/AddressForm";
import { getAccount } from "@/lib/customer/account";
import { MAX_ADDRESSES, mapLink, myAddresses } from "@/lib/customer/addresses";
import { getCheckoutSettings } from "@/lib/shop-data";
import { deleteAddress, makeDefaultAddress } from "../actions";
import AccountIcon, { AccountMedal } from "@/components/account/AccountIcon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ edit?: string; add?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Addresses" });
  return { title: `${t("title")} · Thaanora`, robots: { index: false } };
}

// Her saved addresses (and gift recipients). ?add=1 shows a new form, ?edit=<id> edits one.
export default async function AddressesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const account = await getAccount();
  if (account.state === "guest") redirect(`/${locale}/account/sign-in`);
  if (account.state !== "customer") redirect(`/${locale}/account`);

  const [t, tAcc, tAreas, list, settings, sp] = await Promise.all([
    getTranslations("Addresses"),
    getTranslations("Account"),
    getTranslations("Areas"),
    myAddresses(),
    getCheckoutSettings(),
    searchParams,
  ]);
  const editing = sp.edit ? (list.find((a) => a.id === sp.edit) ?? null) : null;
  const showForm = Boolean(editing) || sp.add === "1" || list.length === 0;
  const areaLabel = (a: string) => {
    const key = a.split(/\s+/)[0]?.toLowerCase() ?? "";
    return key && tAreas.has(key) ? tAreas(key) : a;
  };
  const me = { name: account.customer.name, phone: account.customer.phone };

  return (
    <AccountShell>
      <Link href="/account" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
        {tAcc("backToAccount")}
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-tight text-emerald md:text-[38px] flex items-center gap-3">
          <AccountMedal name="addresses" />{t("title")}</h1>
          <p className="m-0 text-[14px] text-muted">{t("intro")}</p>
        </div>
        {!showForm && list.length < MAX_ADDRESSES && (
          <Link href="/account/addresses?add=1" className="th-btn no-underline">
            {t("add")}
          </Link>
        )}
      </div>

      {showForm && (
        <Card labelledBy="form" className="mb-4">
          <h2 id="form" className="m-0 mb-3 text-[16px] font-semibold text-emerald flex items-center gap-2">
            <AccountIcon name="addresses" />
            {editing ? t("editTitle") : t("newTitle")}
          </h2>
          <AddressForm address={editing} areas={settings.areas.map((a) => a.area)} me={me} />
          {list.length > 0 && (
            <Link href="/account/addresses" className="mt-3 inline-flex min-h-[40px] items-center text-[14px] text-emerald underline underline-offset-2">
              {t("cancel")}
            </Link>
          )}
        </Card>
      )}

      {list.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 rounded-[20px] border border-line bg-ivory-white p-4 shadow-[0_6px_18px_rgba(14,59,46,0.05)]">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[15px] font-medium text-emerald">{a.label}</b>
                {a.isDefault && <span className="rounded-full bg-[#E4F1EA] px-2 py-0.5 text-[12px] text-emerald">{t("default")}</span>}
                {a.isGift && <span className="rounded-full bg-[#F6EEDC] px-2 py-0.5 text-[12px] text-gold-ink">{t("gift")}</span>}
              </div>
              <p className="m-0 text-[14px]">
                <bdi>{a.recipientName}</bdi>
                {a.recipientPhone && (
                  <>
                    {" · "}
                    <bdi dir="ltr">{`0${a.recipientPhone.slice(4)}`}</bdi>
                  </>
                )}
              </p>
              <p className="m-0 text-[14px] text-muted">
                {[areaLabel(a.area), a.district, a.details].filter(Boolean).join(" · ")}
              </p>
              {a.lat !== null && a.lng !== null && (
                <a href={mapLink(a.lat, a.lng)} target="_blank" rel="noopener noreferrer" className="text-[13px] text-emerald underline underline-offset-2">
                  {t("onMap")}
                </a>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px]">
                <Link href={`/account/addresses?edit=${a.id}`} className="min-h-[36px] text-emerald underline underline-offset-2">
                  {t("edit")}
                </Link>
                {!a.isDefault && (
                  <form action={makeDefaultAddress.bind(null, a.id, locale)}>
                    <button type="submit" className="min-h-[36px] text-emerald underline underline-offset-2">
                      {t("setDefault")}
                    </button>
                  </form>
                )}
                <form action={deleteAddress.bind(null, a.id, locale)}>
                  <button type="submit" className="min-h-[36px] text-rani underline underline-offset-2">
                    {t("delete")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
