import { getAdminT } from "@/lib/admin/i18n";
import { displayNumber } from "@/lib/wa-templates";

// Under every "Message customer" button: which WhatsApp to send from (the shop's number in Settings).
export default async function ShopNumberNote({ number }: { number: string | null }) {
  const t = await getAdminT();
  return number ? (
    <p className="m-0 mt-2 text-[12px] text-muted">
      {t.rich("orders.sendFrom", {
        number: displayNumber(number),
        n: (chunks) => (
          <bdi dir="ltr" className="font-medium text-emerald">
            {chunks}
          </bdi>
        ),
      })}
    </p>
  ) : (
    <p role="alert" className="m-0 mt-2 text-[12px] text-rani">
      {t("orders.noShopNumber")}
    </p>
  );
}
