# SEO

- **Metadata**: every public page has a unique title (template `%s | DOVEEYS KITCHEN`), description, canonical URL, Open Graph and Twitter tags (`src/lib/seo.ts: pageMetadata`). `metadataBase` comes from `NEXT_PUBLIC_APP_URL`: **set it to the real https domain** or canonical and sitemap URLs will be wrong.
- **Products**: `/menu/{slug}` is rendered on the server (content in the HTML) with Product JSON-LD: `Offer` for normal meals, `AggregateOffer` plus one `Offer` per litre size for special meals, availability, brand, category and ingredients; breadcrumbs; a 1200x630 share image from the meal photo.
- **Structured data**: Restaurant (hours, contact, social, OrderAction), WebSite with SearchAction (`/menu?q=`), BreadcrumbList, ItemList on menu and category pages, FAQPage, AboutPage, ContactPage, and the developer Person + Organization.
- **Crawling**: `/sitemap.xml` (live meals with images, categories, pages; archived meals excluded), `/robots.txt` (blocks `/admin/`, `/api/`, `/cart`, `/checkout`, `/track/`), `/manifest.webmanifest`, generated favicon, Apple icon and Open Graph image, `humans.txt`. Search-result pages are `noindex`.
- **Category pages**: `/menu/category/{slug}`.
- **Developer credit**: footer link on every page (rel="author", dofollow) to https://gktech.gokafood.com, a `/credits` page with Person structured data (Godsave Kawurem, Founder & CEO of GokaFood Technologies Limited), `author` meta tags and `humans.txt`. Edit in `src/config/developer.config.ts`.
- **Performance/accessibility**: explicit image sizes, lazy loading, priority hero, skip link, landmarks, one h1 per page.
- **Search consoles**: set `GOOGLE_SITE_VERIFICATION` and/or `BING_SITE_VERIFICATION`, then submit `/sitemap.xml`.
- **Do before launch**: the home page hero uses an Unsplash placeholder image; replace it with your own food photography (better for ranking, speed and licensing). Fill in the about text, address, hours and contact details in Settings so structured data is complete.
