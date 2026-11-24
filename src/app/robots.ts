import type { MetadataRoute } from "next";
import { abs, baseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/cart", "/checkout", "/track/"] }],
    sitemap: abs("/sitemap.xml"),
    host: baseUrl,
  };
}
