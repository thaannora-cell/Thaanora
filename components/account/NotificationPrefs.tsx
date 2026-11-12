"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setNotificationChannel } from "@/app/[locale]/account/actions";
import { NOTIFICATION_TYPES, type NotificationChannel, type NotificationType } from "@/lib/notifications";

// One switch per type: website only, or website + WhatsApp (sent by the team). Saves on change.
export default function NotificationPrefs({ prefs }: { prefs: Partial<Record<NotificationType, NotificationChannel>> }) {
  const t = useTranslations("Notifications");
  const [values, setValues] = useState(prefs);
  const [saved, setSaved] = useState<NotificationType | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const change = (type: NotificationType, channel: NotificationChannel) => {
    setValues((v) => ({ ...v, [type]: channel }));
    start(async () => {
      const r = await setNotificationChannel(type, channel);
      setFailed(!r.ok);
      setSaved(r.ok ? type : null);
    });
  };

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {NOTIFICATION_TYPES.map((type) => {
        const id = `pref-${type}`;
        return (
          <li key={type} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 last:border-b-0">
            <label htmlFor={id} className="min-w-0 text-[14px]">
              {t(`types.${type}.label`)}
              {saved === type && !pending && (
                <span role="status" className="ms-2 text-[12px] text-emerald">
                  {t("saved")}
                </span>
              )}
            </label>
            <select
              id={id}
              value={values[type] ?? "site"}
              onChange={(e) => change(type, e.target.value as NotificationChannel)}
              className="th-field min-h-[40px] w-auto py-1.5 text-[14px]"
            >
              <option value="site">{t("channel.site")}</option>
              <option value="site_whatsapp">{t("channel.site_whatsapp")}</option>
            </select>
          </li>
        );
      })}
      {failed && (
        <li role="alert" className="pt-2 text-[13px] text-rani">
          {t("saveFailed")}
        </li>
      )}
    </ul>
  );
}
