import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon (iPhone "Add to Home Screen"): the emerald medal with a gold T and the pink dot.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#0E3B2E" }}>
        <div style={{ width: 150, height: 150, borderRadius: 75, border: "5px solid #C8A15A", display: "flex", alignItems: "center", justifyContent: "center", color: "#E6CB8E", fontSize: 96, fontFamily: "serif", fontWeight: 700 }}>
          T
        </div>
        <div style={{ position: "absolute", top: 26, right: 34, width: 18, height: 18, borderRadius: 9, background: "#C81E5E" }} />
      </div>
    ),
    size,
  );
}
