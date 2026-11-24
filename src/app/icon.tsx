import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#245C37", color: "#FAF9F5", fontSize: 40, fontWeight: 700, borderRadius: 12 }}>D</div>,
    size,
  );
}
