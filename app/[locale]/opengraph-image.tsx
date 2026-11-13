import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Thaanora — Original Pakistani unstitched suits in Riyadh";

// The picture shown when the shop is shared on WhatsApp, Instagram, X… (suit pages use the suit's photo).
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at 80% 10%, #17543F 0%, #0E3B2E 60%)",
          color: "#FBF8F2",
          fontFamily: "serif",
        }}
      >
        <div style={{ width: 150, height: 150, borderRadius: 75, border: "5px solid #C8A15A", display: "flex", alignItems: "center", justifyContent: "center", color: "#E6CB8E", fontSize: 88, fontWeight: 700 }}>T</div>
        <div style={{ marginTop: 34, fontSize: 84, letterSpacing: 18, color: "#E6CB8E", display: "flex" }}>
          THAANORA
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#C81E5E", marginTop: -6, marginLeft: -6 }} />
        </div>
        <div style={{ marginTop: 18, fontSize: 40, fontStyle: "italic" }}>Your fabric. Your fit.</div>
        <div style={{ marginTop: 26, fontSize: 28, color: "#C8A15A", letterSpacing: 4 }}>ORIGINAL PAKISTANI UNSTITCHED SUITS · RIYADH</div>
      </div>
    ),
    size,
  );
}
