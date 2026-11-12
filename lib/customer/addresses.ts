import "server-only";
import { getSessionClient } from "@/lib/supabase/server";

export type Address = {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string | null; // +9665XXXXXXXX
  area: string;
  district: string | null;
  details: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  isGift: boolean;
};

export const MAX_ADDRESSES = 10;

// Her saved addresses, default first. Row Level Security returns only her own.
export async function myAddresses(): Promise<Address[]> {
  const supabase = await getSessionClient();
  const { data } = await supabase
    .from("addresses")
    .select("id, label, recipient_name, recipient_phone, area, district, details, lat, lng, is_default, is_gift")
    .order("is_default", { ascending: false })
    .order("created_at");
  return (data ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    recipientName: a.recipient_name,
    recipientPhone: a.recipient_phone,
    area: a.area,
    district: a.district,
    details: a.details,
    lat: a.lat === null ? null : Number(a.lat),
    lng: a.lng === null ? null : Number(a.lng),
    isDefault: a.is_default,
    isGift: a.is_gift,
  }));
}

// A map link the driver can open on any phone (no map key needed).
export const mapLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

// The address as one line for the order, the WhatsApp message and the back office.
export function addressLine(a: Pick<Address, "district" | "details" | "lat" | "lng">): string {
  return [a.district, a.details, a.lat !== null && a.lng !== null ? mapLink(a.lat, a.lng) : null].filter(Boolean).join(" · ");
}
