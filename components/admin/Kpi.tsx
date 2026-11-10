import AdminIcon from "./AdminIcon";

// Prototype KPI tile: icon square, big number, small label. "warn" turns the icon pink when it needs action.
export default function Kpi({ icon, value, label, warn = false }: { icon: string; value: React.ReactNode; label: string; warn?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-[18px] border border-[#E1E6DF] bg-white p-[18px] shadow-[0_6px_18px_rgba(14,59,46,0.05)]">
      <span className={`inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] ${warn ? "bg-[#FBE7EE] text-rani" : "bg-[#E8F0EB] text-emerald"}`}>
        <AdminIcon name={icon} />
      </span>
      <span className="min-w-0">
        <b className="block font-[family-name:var(--font-cormorant)] text-[32px] font-semibold leading-none tabular-nums text-emerald">{value}</b>
        <small className="block text-[13px] text-muted">{label}</small>
      </span>
    </div>
  );
}
