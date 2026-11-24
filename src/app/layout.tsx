import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { ThemeScript } from "@/components/shared/theme-script";
import { brandConfig, developerConfig } from "@/config";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, baseUrl } from "@/lib/seo";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant", display: "swap", fallback: ["Georgia", "serif"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", fallback: ["system-ui", "sans-serif"] });

const TITLE = `${brandConfig.name} | Thoughtfully prepared meals, ordered online`;

// Pages set their own canonical URL; the root deliberately does not, so no page can accidentally canonicalise to "/".
export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: TITLE, template: `%s | ${brandConfig.name}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: brandConfig.name,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: developerConfig.name, url: developerConfig.portfolioUrl }],
  creator: developerConfig.name,
  category: "food",
  openGraph: { type: "website", siteName: brandConfig.name, locale: "en_NG", title: TITLE, description: DEFAULT_DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DEFAULT_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  formatDetection: { telephone: true, email: true, address: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION, other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FAF9F5" }, { media: "(prefers-color-scheme: dark)", color: "#121713" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${cormorant.variable} ${manrope.variable}`}>
      <head><ThemeScript /><link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" /></head>
      <body>{children}</body>
    </html>
  );
}
