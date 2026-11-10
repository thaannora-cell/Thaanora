import type { OrderStatus } from "@/lib/admin/dashboard";

// Prototype chip colours: waiting = pink tint, delivered = green, refused/cancelled = grey, others neutral.
const TONE: Record<OrderStatus, string> = {
  waiting_confirmation: "bg-[#FBE7EE] text-rani",
  confirmed: "bg-[#EEF2EE] text-emerald",
  packed: "bg-[#EEF2EE] text-emerald",
  with_courier: "bg-emerald text-gold-light",
  delivered_cash_collected: "bg-[#E3F1E8] text-[#1E6B43]",
  refused_at_door: "bg-[#5C635F] text-white",
  cancelled: "bg-[#5C635F] text-white",
};

export default function StatusChip({ status, label }: { status: OrderStatus; label: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[status]}`}>{label}</span>;
}
