# Environment variables

| Variable | Secret? | Purpose |
|---|---|---|
| DATABASE_URL | secret | PostgreSQL connection (pooled in production) |
| DIRECT_URL | secret | Direct connection for migrations |
| NEXT_PUBLIC_APP_URL | public | Canonical site URL (https), used in emails, callbacks, SEO |
| PAYSTACK_SECRET_KEY | secret | Server-side Paystack calls and webhook signature |
| PAYSTACK_PUBLIC_KEY | public | Reserved (checkout is redirect-based; not required) |
| SMTP_HOST, SMTP_PORT, SMTP_SECURE | config | Mail server (`SMTP_SECURE=true` for port 465) |
| SMTP_USER, SMTP_PASSWORD | secret | Mail credentials |
| SMTP_FROM_EMAIL, SMTP_FROM_NAME | config | Sender |
| CLOUDINARY_CLOUD_NAME | config | Cloudinary account |
| CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET | secret | Server-side uploads |
| ADMIN_SETUP_KEY | secret | Needed to register the two administrators |
| DEFAULT_ADMIN_EMAIL | config | Default order-notification recipient(s), comma separated |
| CRON_SECRET | secret | Authorises cron endpoints (Vercel sends it automatically) |
| GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION | public | Optional search console verification |
Never commit real values.
