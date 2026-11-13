"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveMeasurements } from "@/app/[locale]/account/actions";
import { cleanMeasurements, hasMeasurements, MEASURE_FIELDS, NECKLINES, type Measurements } from "@/lib/measurements";

// The shop's tailor screen keeps measurements on the device under this key.
const DEVICE_KEY = "th_measurements";

// Her measurements on the account. If the account has none yet but this device does (saved earlier in
// the shop's tailor screen), they're shown so she can keep them with one tap.
export default function MeasurementsForm({ saved }: { saved: Measurements }) {
  const t = useTranslations("Panel");
  const tT = useTranslations("Tailor");
  const [m, setM] = useState<Measurements>(saved);
  const [fromDevice, setFromDevice] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (hasMeasurements(saved)) return;
    try {
      const device = cleanMeasurements(JSON.parse(window.localStorage.getItem(DEVICE_KEY) ?? "{}"));
      if (hasMeasurements(device)) {
        setM(device);
        setFromDevice(true);
      }
    } catch {
      /* nothing on this device */
    }
  }, [saved]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveMeasurements(m);
      if (r.ok) {
        try {
          window.localStorage.setItem(DEVICE_KEY, JSON.stringify(cleanMeasurements(m)));
        } catch {
          /* storage blocked */
        }
        setFromDevice(false);
        setMsg({ text: tT("measurementsSaved") });
      } else setMsg({ text: tT("saveFailed"), bad: true });
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      {fromDevice && <p className="m-0 rounded-xl bg-[#F4F7F4] px-3 py-2 text-[13px] text-emerald">{tT("fromDevice")}</p>}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {MEASURE_FIELDS.map((f) => (
          <label key={f} className="flex flex-col gap-1.5 text-[13px] text-muted">
            {t(`m_${f}`)}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="80"
              step="0.5"
              dir="ltr"
              value={m[f] ?? ""}
              onChange={(e) => setM((v) => ({ ...v, [f]: e.target.value }))}
              className="th-field text-start"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          {t("m_neck")}
          <select value={m.neck ?? "round"} onChange={(e) => setM((v) => ({ ...v, neck: e.target.value }))} className="th-field">
            {NECKLINES.map((n) => (
              <option key={n} value={n}>
                {t(`neck_${n}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" disabled={pending} className="th-btn self-start disabled:opacity-60">
        {pending ? tT("saving") : t("saveMeasurements")}
      </button>
      {msg && (
        <p role={msg.bad ? "alert" : "status"} className={`m-0 text-[14px] ${msg.bad ? "text-rani" : "text-emerald"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
