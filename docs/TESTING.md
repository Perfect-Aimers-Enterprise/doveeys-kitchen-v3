# Testing

`npm test`: 44 unit tests (money, tokens, auth primitives, pricing, delivery fee rules, status rules, webhook signatures, order payload validation, SEO output, JSON-LD escaping).

`npm run test:integration`: 35 tests that call the real services against **real PostgreSQL** (Paystack HTTP and SMTP are the only mocks). Set `TEST_DATABASE_URL` to an empty database whose name contains "test", with the schema applied (`prisma migrate deploy`). The database is truncated before each test. Covered: two-admin limit under concurrent requests, lockout, rate limiter, password reset, meal and litre-option editing, historical pricing, server-side pricing, delivery fees and zones, payment verification (amount, currency, pending, failed), concurrent verification, webhook signature, duplicates and retry, tracking privacy, status rules and concurrent changes, refunds, analytics, customers, settings overrides, PDF reports and idempotency, cron authorisation, email failure not undoing a payment.

**End-to-end smoke test** (done during development, not in the repo): production build served against a seeded database; 71 checks covered login, deep-link redirects, every admin page, admin API, PDF download, public pages, structured data, sitemap, robots and icons. 71/71 passed.

## Not covered (be aware)
- No automated browser or mobile-layout tests; the responsive layouts were built for 320 px and up but have not been visually verified on devices.
- Paystack test mode and real SMTP/Cloudinary were not exercised (no network access in the build environment): run one real test payment, one test email and one image upload after deploying.
- Image upload to Cloudinary is validated by unit logic (format sniffing) but not executed.
