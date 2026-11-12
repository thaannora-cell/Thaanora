"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setFavourite } from "@/app/[locale]/account/actions";

// "Remove" on the Favourites page: takes the heart off her account and off this device.
export default function FavouriteRemove({ code }: { code: string }) {
  const t = useTranslations("Favourites");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setFavourite(code, false);
          try {
            const saved = JSON.parse(window.localStorage.getItem("th_saved") ?? "[]");
            if (Array.isArray(saved)) window.localStorage.setItem("th_saved", JSON.stringify(saved.filter((c) => c !== code)));
          } catch {
            /* storage blocked */
          }
          router.refresh();
        })
      }
      className="min-h-[36px] text-[13px] text-rani underline underline-offset-2 disabled:opacity-60"
    >
      {t("remove")}
    </button>
  );
}
