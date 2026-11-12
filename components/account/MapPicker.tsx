"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

const RIYADH: [number, number] = [24.7136, 46.6753];

// Tap the map (or drag the pin, or use her location) to mark the door. OpenStreetMap tiles, free.
// The chosen point goes into hidden lat / lng fields of the surrounding form.
export default function MapPicker({ lat, lng }: { lat: number | null; lng: number | null }) {
  const t = useTranslations("Addresses");
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const placeRef = useRef<((ll: [number, number]) => void) | null>(null);
  const [point, setPoint] = useState<[number, number] | null>(lat !== null && lng !== null ? [lat, lng] : null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied">("idle");

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current || map.current) return;
      const start = point ?? RIYADH;
      const m = L.map(box.current, { center: start, zoom: point ? 16 : 11, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      // A gold pin drawn in CSS (Leaflet's own pin images don't survive bundling).
      const icon = L.divIcon({ className: "th-map-pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
      const place = (ll: [number, number]) => {
        if (pin.current) pin.current.setLatLng(ll);
        else {
          pin.current = L.marker(ll, { icon, draggable: true, keyboard: true }).addTo(m);
          pin.current.on("dragend", () => {
            const p = pin.current!.getLatLng();
            setPoint([p.lat, p.lng]);
          });
        }
        setPoint(ll);
      };
      if (point) place(point);
      m.on("click", (e) => place([e.latlng.lat, e.latlng.lng]));
      map.current = m;
      placeRef.current = place;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
    // Built once; later changes come from the map itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMine = () => {
    if (!navigator.geolocation) return setLocating("denied");
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        placeRef.current?.(ll);
        map.current?.setView(ll, 17);
        setLocating("idle");
      },
      () => setLocating("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const clear = () => {
    pin.current?.remove();
    pin.current = null;
    setPoint(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div ref={box} className="h-[260px] w-full overflow-hidden rounded-xl border border-line" role="application" aria-label={t("mapLabel")} dir="ltr" />
      <input type="hidden" name="lat" value={point ? point[0].toFixed(6) : ""} />
      <input type="hidden" name="lng" value={point ? point[1].toFixed(6) : ""} />
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <button type="button" onClick={useMine} disabled={locating === "busy"} className="th-btn min-h-[38px] py-1 text-[13px] disabled:opacity-60">
          {locating === "busy" ? t("locating") : t("useLocation")}
        </button>
        {point && (
          <button type="button" onClick={clear} className="min-h-[36px] text-rani underline underline-offset-2">
            {t("clearPin")}
          </button>
        )}
        <span className="text-muted">{point ? t("pinSet") : t("pinHint")}</span>
      </div>
      {locating === "denied" && <p className="m-0 text-[13px] text-rani">{t("locationDenied")}</p>}
    </div>
  );
}
