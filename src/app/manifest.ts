import type { MetadataRoute } from "next";
import { brandConfig } from "@/config";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return { name: brandConfig.name, short_name: "DOVEEYS", description: DEFAULT_DESCRIPTION, start_url: "/", display: "standalone", background_color: "#FAF9F5", theme_color: "#245C37", categories: ["food", "shopping"] };
}
