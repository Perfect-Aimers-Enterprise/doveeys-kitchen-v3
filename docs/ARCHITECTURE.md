# Architecture

One Next.js application serves the storefront, the administrator dashboard and the JSON API. No microservices.

```
Route handler / Server Component  ->  Service  ->  Prisma (PostgreSQL)  |  external clients
 (auth, Zod, response shape)         (all rules,                          Paystack, Cloudinary, SMTP
                                      transactions)
```
- `src/app/api/**`: thin handlers. `src/lib/admin-route.ts` wraps every admin handler (session check, same-origin check, error envelope).
- `src/services/**`: business logic: `order`, `payment`, `notification`, `order-admin`, `order-query`, `meal-admin`, `catalog`, `delivery`, `settings`, `analytics`, `customer`, `report`, `email`, `auth`, `tracking`.
- `src/lib/**`: `auth`, `db`, `email`, `paystack`, `cloudinary`, `reports` (PDF), `security` (tokens, rate limit, redirect, request), `validation` (Zod), `pricing`, `order-status`, `seo`.
- `src/config/**`: typed non-secret defaults. `src/app/admin/**`: dashboard. Other `src/app/**`: storefront.

## Key decisions
- **Server decides money.** Browsers send ids and quantities only; prices, delivery fee, totals and statuses are computed on the server.
- **Immutable order snapshots.** `OrderItem` copies name, litres, unit price and quantity; `Order` copies delivery fee and totals.
- **Payments are confirmed by asking Paystack**, from both the browser verify endpoint and the webhook, through one function that is safe to run concurrently.
- **Sessions** are opaque random tokens whose SHA-256 hash is stored; cookie is HTTP-only. Middleware is a fast gate; real validation happens in server layouts and handlers.
- **Settings resolve** database override, then config-file default, then fallback.
- **Scheduled work** is HTTP endpoints called by Vercel Cron, never in-memory timers.

## Data flow: a paid order
`POST /api/public/orders` (price + snapshot + Paystack init) -> customer pays on Paystack -> browser calls `GET /api/public/payments/verify` and/or Paystack calls the webhook -> `verifyAndApplyPayment` (re-verify, claim payment row, mark PAID, hash token, history) -> emails (customer link, admin deep link) -> admin changes status in the dashboard -> customer status emails.
