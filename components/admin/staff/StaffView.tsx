"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { StaffMember } from "@/lib/admin/staff";
import { inviteStaff, setStaffActive, setStaffRole } from "@/app/admin/(panel)/staff/actions";
import type { FormResult } from "@/app/admin/(panel)/offers/actions";
import { useSubmit } from "../useSubmit";
import Toggle from "../products/Toggle";
import ResultLine from "../ResultLine";

const panel = "min-w-0 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]";
const h2 = "m-0 mb-3 text-[16px] font-semibold text-emerald";
const field = "min-h-[44px] w-full min-w-0 rounded-xl border border-[#DDD3C0] bg-white px-3 text-[15px] text-ink focus:border-gold focus:outline-none";
const label = "flex min-w-0 flex-col gap-1.5 text-[13px] text-muted";
const ROLES = ["owner", "orders", "catalogue"] as const;

export default function StaffView({ staff, me, signIns }: { staff: StaffMember[]; me: string; signIns: Record<string, string> }) {
  const t = useTranslations("Admin.staff");
  const tRole = useTranslations("Admin.roles");
  const tRoleText = useTranslations("Admin.roleText");
  const [rowRes, setRowRes] = useState<FormResult | null>(null);
  const [pending, start] = useTransition();
  const [blocking, setBlocking] = useState<string | null>(null);
  const [res, submit, busy] = useSubmit<FormResult>(inviteStaff, {});

  const toggle = (s: StaffMember) => {
    if (s.active && blocking !== s.id) return setBlocking(s.id);
    setBlocking(null);
    start(async () => setRowRes(await setStaffActive(s.id, !s.active)));
  };

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 font-[family-name:var(--font-cormorant)] text-[28px] font-semibold leading-tight text-emerald md:text-[34px]">{t("title")}</h1>
        <p className="m-0 text-[14px] text-muted">{t("sub")}</p>
      </div>

      <section aria-labelledby="people" className={panel}>
        <h2 id="people" className={h2}>
          {t("peopleTitle")}
        </h2>
        <ul className="m-0 flex list-none flex-col p-0">
          {staff.map((s) => {
            const self = s.id === me;
            return (
              <li key={s.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#F0EBE1] py-3 last:border-b-0 ${s.active ? "" : "opacity-70"}`}>
                <span className="min-w-[200px] flex-1">
                  <b className="font-medium text-emerald">
                    <bdi>{s.name}</bdi>
                  </b>
                  {self && <span className="ms-1.5 rounded-full bg-gold/30 px-2 py-0.5 text-[11px] text-gold-ink">{t("you")}</span>}
                  {!s.active && <span className="ms-1.5 rounded-full bg-[#5C635F] px-2 py-0.5 text-[11px] text-white">{t("blocked")}</span>}
                  <small className="block text-muted">
                    <bdi dir="ltr">{s.email ?? "—"}</bdi> · {signIns[s.id] ? t("lastSignIn", { time: signIns[s.id] }) : t("neverSignedIn")}
                  </small>
                </span>
                <label className="flex items-center gap-2 text-[13px] text-muted">
                  <span className="sr-only">{t("roleFor", { name: s.name })}</span>
                  <select
                    value={s.role}
                    disabled={pending || self}
                    onChange={(e) => start(async () => setRowRes(await setStaffRole(s.id, e.target.value)))}
                    className="min-h-[40px] rounded-xl border border-[#DDD3C0] bg-white px-2.5 text-[14px] text-ink"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {tRole(r)}
                      </option>
                    ))}
                  </select>
                </label>
                {self ? (
                  <span className="text-[13px] text-muted">{t("alwaysOn")}</span>
                ) : (
                  <span className="flex items-center gap-2 text-[13px]">
                    <Toggle on={s.active} label={t("canSignIn", { name: s.name })} onChange={() => toggle(s)} />
                    {blocking === s.id ? (
                      <button type="button" onClick={() => toggle(s)} className="min-h-[32px] rounded-full border border-rani/40 bg-white px-3 font-medium text-rani">
                        {t("confirmBlock")}
                      </button>
                    ) : (
                      <span className="text-muted">{s.active ? t("canSignInShort") : t("blocked")}</span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <ResultLine result={rowRes} ns="staff" />
      </section>

      <section aria-labelledby="invite" className={`${panel} mt-4`}>
        <h2 id="invite" className={h2}>
          {t("inviteTitle")}
        </h2>
        <form onSubmit={submit} key={res.ok ? res.at : "i"} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <label className={label}>
              {t("name")}
              <input name="name" required maxLength={80} className={field} />
            </label>
            <label className={label}>
              {t("email")}
              <input name="email" type="email" inputMode="email" required dir="ltr" maxLength={200} className={field} />
            </label>
            <label className={label}>
              {t("role")}
              <select name="role" defaultValue="orders" className={field}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {tRole(r)} · {tRoleText(r)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" disabled={busy} className="inline-flex min-h-[44px] items-center self-start rounded-full border border-emerald bg-emerald px-4 text-[15px] font-medium text-ivory-white disabled:opacity-60">
            {t("invite")}
          </button>
          <ResultLine result={res} ns="staff" />
        </form>
        <p className="m-0 mt-2 text-[12px] text-muted">{t("inviteHint")}</p>
      </section>
    </>
  );
}
