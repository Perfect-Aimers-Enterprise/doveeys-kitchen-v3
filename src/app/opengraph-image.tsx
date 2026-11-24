import { ImageResponse } from "next/og";

export const alt = "DOVEEYS KITCHEN: thoughtfully prepared meals, ordered online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 96px", background: "#173F29", color: "#FAF9F5" }}>
        <div style={{ display: "flex", width: 96, height: 6, background: "#D99035", marginBottom: 40 }} />
        <div style={{ display: "flex", fontSize: 96, letterSpacing: 8, fontWeight: 700 }}>DOVEEYS KITCHEN</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 28, opacity: 0.85 }}>Thoughtfully prepared meals, ordered online</div>
      </div>
    ),
    size,
  );
}
