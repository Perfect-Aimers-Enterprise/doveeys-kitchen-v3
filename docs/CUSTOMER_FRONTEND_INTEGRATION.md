# Customer frontend integration (Stage Two)

Status: implemented and verified by integration tests on PostgreSQL (see TESTING.md).

Base URL: `NEXT_PUBLIC_APP_URL`. Stage Two can live in the same Next.js app (call services directly) or call these
routes over HTTP. All routes below are public and need no cookie.

## Envelope

Success: `{ "ok": true, "data": { ... } }`
Failure: `{ "ok": false, "error": { "code": "STRING", "message": "Human readable", "fields": { "path": "message" } } }`

| HTTP | Meaning |
|------|---------|
| 404 | not found (`MEAL_NOT_FOUND`, `TRACKING_NOT_FOUND`, `PAYMENT_NOT_FOUND`) |
| 422 | validation or business rule (`VALIDATION_ERROR`, `MEAL_UNAVAILABLE`, `OPTION_REQUIRED`, `DELIVERY_ZONE_REQUIRED`, ...) |
| 429 | `RATE_LIMITED` |
| 502 | `PAYMENT_INIT_FAILED`, `VERIFY_UNAVAILABLE` |

Money is always a **string with two decimals** (`"12000.00"`). Never convert it to a float for arithmetic.

## What the browser may and may not decide

| Browser sends | Server decides |
|---------------|----------------|
| meal id, option id, quantity | every price, line total, subtotal |
| delivery zone id, address | delivery fee (zone fee, default fee, free-delivery threshold) |
| customer name, email, phone | currency, order reference, payment status, order status |

Any extra field (`price`, `total`, `deliveryFee`, `paymentStatus`...) makes the request fail with `VALIDATION_ERROR`.
Displayed totals in the cart are a convenience; the order response is the truth.

## Endpoints

### GET /api/public/meals
Query: `category` (slug), `featured=true`, `q` (search), `type=NORMAL|SPECIAL`. Archived meals are never returned.
Unavailable meals are returned with `isAvailable:false` so the UI can show them disabled.

```json
{ "ok": true, "data": { "meals": [
  { "id": "clx..", "slug": "jollof-rice", "name": "Jollof rice", "description": "..", "ingredients": null,
    "type": "NORMAL", "price": "5000.00", "options": [], "image": "https://res.cloudinary.com/..",
    "isAvailable": true, "isFeatured": false, "category": { "id": "..", "name": "..", "slug": ".." } },
  { "id": "clx..", "slug": "pepper-soup", "type": "SPECIAL", "price": null,
    "options": [ { "id": "opt1", "litres": "1", "price": "12000.00" }, { "id": "opt2", "litres": "2", "price": "23000.00" } ] }
] } }
```
Special meals have `price: null`; the customer must choose one `options[].id`. The number of options is not fixed.

### GET /api/public/meals/{slug}  ->  `{ meal }` (same shape) or 404
### GET /api/public/categories  ->  `{ categories: [{ id, name, slug, mealCount }] }`
### GET /api/public/config
Brand, contact, address, social links, operating hours, about, owner, announcement, footer, currency, delivery
(`defaultFee`, `freeThreshold`, `instructions`, `zones[]`), and `faqs[]`. Owner-editable values come from the database
and fall back to the config files. Contains no secrets.

### GET /api/public/delivery/quote?zoneId=&subtotal=
`{ fee, currency, zone, total }`. Informational. If active zones exist, `zoneId` is required (`DELIVERY_ZONE_REQUIRED`).

### POST /api/public/orders
Creates the order (status `PENDING_PAYMENT`) with an immutable price snapshot and opens a Paystack checkout.
Rate limit: 10 per hour per IP.
```json
{ "items": [ { "mealId": "clx..", "quantity": 2 }, { "mealId": "clx..", "optionId": "opt2", "quantity": 1 } ],
  "customer": { "name": "Ada Obi", "email": "ada@example.com", "phone": "+234 801 234 5678" },
  "delivery": { "address": "12 Example Street", "notes": "Call at gate", "zoneId": null } }
```
201:
```json
{ "ok": true, "data": { "orderReference": "DK-7QX2-M9KD", "paymentReference": "DKP-<24 hex>",
  "subtotal": "33000.00", "deliveryFee": "1500.00", "total": "34500.00", "currency": "NGN",
  "paystack": { "authorizationUrl": "https://checkout.paystack.com/..", "accessCode": ".." } } }
```
Redirect the browser to `paystack.authorizationUrl`. Paystack returns the customer to `{APP_URL}/checkout/complete?reference=...&trxref=...`.
If Paystack cannot be reached the order is cancelled and `PAYMENT_INIT_FAILED` is returned; nothing was charged.

### GET /api/public/payments/verify?reference=DKP-...
Call this from `/checkout/complete`. The server asks Paystack directly and checks reference, amount, currency and status.
Returns `{ state: "paid" | "pending" | "failed" | "mismatch", orderReference }`.
- `paid`: show the thank-you page. The tracking link is emailed; it is **not** returned here (see below).
- `pending`: payment not finished; poll every few seconds for up to about a minute.
- `failed`: offer to start a new order. `mismatch`: show a support message with `orderReference`.
The webhook may confirm the payment first. Both paths are safe to run together; emails are sent exactly once.

### GET /api/public/track/{token}
`token` comes from the emailed link `/track/{token}`. Returns a safe view: reference, first name, payment status,
items (name, litres, quantity, prices), totals, delivery area, `timeline[]` (PAID ... DELIVERED with `reachedAt`),
`cancelled`. It never includes email, phone, street address or admin information. Unknown tokens return 404.
Only a hash of the token is stored, so the link exists only in the confirmation email; later status emails tell the
customer to use that link.

## Emails the customer receives
Payment confirmation with tracking link (on verified payment), then a short email on CONFIRMED, PROCESSING, READY,
OUT_FOR_DELIVERY, DELIVERED and CANCELLED. Email failures are logged and never affect the order.

## Pages Stage Two must provide
`/checkout/complete` (calls verify), `/track/[token]` (calls track). Everything else (menu, cart, checkout form) is
presentation over the endpoints above. Keep the cart in the browser; send only ids and quantities.

## Implemented storefront pages
`/`, `/menu` (search `?q=`), `/menu/normal`, `/menu/special`, `/menu/category/{slug}`, `/menu/{slug}` (server-rendered with product structured data), `/cart`, `/checkout`, `/checkout/complete`, `/track/{token}`, `/about`, `/faq`, `/contact`, `/credits`. Cart, checkout, tracking and admin are `noindex`. See SEO.md.

## Notes
- Reserved meal slugs: `normal`, `special`, `category`.
- The tracking link is emailed once; it cannot be re-sent because only its hash is stored.
- The status of this contract: covered by integration tests against PostgreSQL with Paystack mocked at the HTTP level; Paystack **test mode** has not been exercised from this package, so run one real test payment before launch.
