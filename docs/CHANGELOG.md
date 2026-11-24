# Changelog
## Admin completion + SEO
- Administrator dashboard: overview with charts and date filters, orders (search, filters, detail, status, refund records), meals (CRUD, litre options, images, categories, reorder, archive), customers, analytics, reports, settings (business, email, payments, delivery and zones, reports, FAQs).
- Admin APIs, PDF reports with cron, idempotent sending, Cloudinary upload.
- SEO: metadata, JSON-LD, sitemap, robots, manifest, icons, share image, category pages, server-rendered product pages, developer credit.
- Fixes: storefront tracking page failed `next build` (synchronous params); auth pages passed functions to a client component; TypeScript pinned to 5.9 (Next 15 does not support TS 7); brand spelling corrected to DOVEEYS KITCHEN; settings keys `business.owner` split into `business.ownerName`/`ownerBio`.
- API contract: unchanged for customer endpoints. `GET /api/public/config` now also returns `theme`, and `owner` is `{name,bio}`.
## Customer API
Public catalogue, config, delivery quote, order creation with Paystack, verification, webhook, tracking, order emails, order status endpoint.
## Auth
Admin authentication, two-account lock, sessions, password reset, rate limiting.
## Foundation
Schema, configuration layer, design tokens, utilities.
