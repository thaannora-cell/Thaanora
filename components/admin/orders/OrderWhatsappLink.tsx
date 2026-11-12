"use client";

import { markOrderWhatsappSent } from "@/app/admin/(panel)/notifications/actions";

// "Send … on WhatsApp" on the order page. Opening it also ticks off this order's waiting items on the
// Notifications list, so the same update isn't sent twice.
export default function OrderWhatsappLink({ href, orderNo, className, children }: { href: string; orderNo: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => void markOrderWhatsappSent(orderNo)}>
      {children}
    </a>
  );
}
