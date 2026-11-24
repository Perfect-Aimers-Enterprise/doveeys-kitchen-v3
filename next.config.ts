import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  serverExternalPackages: ["argon2", "pdfkit"],
  // pdfkit reads its built-in font metrics from disk; make sure they ship with the serverless functions.
  outputFileTracingIncludes: { "/api/**": ["./node_modules/pdfkit/js/data/*.afm"] },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
export default config;
