# API reference

Envelope: success `{ "ok": true, "data": ... }`; failure `{ "ok": false, "error": { "code", "message", "fields?" } }`. Money is a string with two decimals. Validation errors are `422` with `fields` keyed by path (for example `options.0.litres`). Unknown body fields are rejected (mass-assignment protection).

## Public (no authentication). Details and examples: CUSTOMER_FRONTEND_INTEGRATION.md
| Method | Route | Purpose |
|---|---|---|
| GET | /api/public/meals | List meals (`category`, `featured`, `q`, `type`) |
| GET | /api/public/meals/{slug} | One meal |
| GET | /api/public/categories | Categories with counts |
| GET | /api/public/config | Brand, contact, hours, delivery, FAQs |
| GET | /api/public/delivery/quote | Informational fee quote |
| POST | /api/public/orders | Create order and start Paystack checkout (10/hour/IP) |
| GET | /api/public/payments/verify?reference= | Verify payment with Paystack |
| GET | /api/public/track/{token} | Safe tracking view |
| POST | /api/webhooks/paystack | Signed Paystack webhook |

## Administrator (session cookie required; state-changing requests must be same-origin)
Auth: `GET|POST /api/admin/auth/register` (`{name,email,password,setupKey}`; 403 after 2 admins), `POST .../login` (`{email,password,next?}`), `.../logout`, `.../forgot` (`{email}`), `.../reset` (`{token,password}`), `GET .../me`.

| Method | Route | Body / query | Notes |
|---|---|---|---|
| GET/POST | /api/admin/meals | POST: meal object | `status=active\|archived\|all`, `type`, `q` |
| GET/PUT/PATCH/DELETE | /api/admin/meals/{id} | PUT: meal; PATCH: `{isAvailable?,isFeatured?,archived?}` | DELETE archives |
| POST | /api/admin/meals/reorder | `{ids:[]}` | display order |
| GET/POST | /api/admin/categories | `{name}` | |
| PATCH/DELETE | /api/admin/categories/{id} | `{name}` | DELETE archives and detaches meals |
| POST | /api/admin/categories/reorder | `{ids:[]}` | |
| POST/DELETE | /api/admin/uploads | multipart `file` / `{publicId}` | JPEG/PNG/WebP, 4 MB |
| GET | /api/admin/orders | `q,status,payment,from,to,page` | |
| GET | /api/admin/orders/{id} | | full detail |
| PATCH | /api/admin/orders/{id}/status | `{status,note?}` | 409 `INVALID_TRANSITION` |
| POST | /api/admin/orders/{id}/refund | `{amount,note?}` | records a refund made in Paystack |
| GET/PUT | /api/admin/settings | `{values:{key:value\|null}}` | null clears the override |
| POST | /api/admin/settings/email-test | `{to}` | |
| GET/POST | /api/admin/delivery-zones | `{name,fee,isActive}` | |
| PUT/DELETE | /api/admin/delivery-zones/{id} | | |
| GET/PUT | /api/admin/faqs | `{items:[{question,answer}]}` | replaces the ordered list |
| GET | /api/admin/reports | | history |
| GET | /api/admin/reports/download | `kind=weekly\|monthly\|custom`, `offset`, `from`, `to` | PDF |
| POST | /api/admin/reports/send | `{kind,offset?,force?}` | email a completed period |

Meal object: `{name, slug?, description, ingredients?, type: "NORMAL"|"SPECIAL", basePrice? (normal), categoryId?, isAvailable, isFeatured, imageUrl?, imagePublicId?, options:[{id?,litres,price}] (special)}`.

## Cron (`Authorization: Bearer $CRON_SECRET`)
`GET /api/cron/reports`, `GET /api/cron/email-retry`.

Errors: 401 `UNAUTHENTICATED`, 403 `FORBIDDEN_ORIGIN`/`REGISTRATION_CLOSED`, 404, 409 conflicts, 413/415 images, 422 validation, 429 `RATE_LIMITED`, 502 upstream (Paystack/Cloudinary/SMTP), 503 not configured.
