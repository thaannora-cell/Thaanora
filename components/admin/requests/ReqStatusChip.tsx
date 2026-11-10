import type { RequestStatus } from "@/lib/admin/requests";

const TONE: Record<RequestStatus, string> = {
  new: "bg-[#FBE7EE] text-rani",
  in_progress: "bg-gold/30 text-gold-ink",
  done: "bg-[#E3F1E8] text-[#1E6B43]",
  closed: "bg-[#5C635F] text-white",
};

export default function ReqStatusChip({ status, label }: { status: RequestStatus; label: string }) {
  return <span className={`inline-block shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[status]}`}>{label}</span>;
}
