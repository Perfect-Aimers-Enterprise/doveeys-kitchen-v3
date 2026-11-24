# Email system (Nodemailer)

SMTP is configured by `SMTP_*` environment variables. `sendEmail` logs every attempt in `EmailLog` and **never throws**: a failed email cannot undo a payment or an order.
- Customer: payment confirmation with the tracking link (once), then status updates.
- Administrators: new paid order with details, Paystack reference and the authenticated link `/admin/orders/{id}` (sign-in required). Recipients: setting `notify.recipients` (one or many), defaulting to `DEFAULT_ADMIN_EMAIL`.
- Reports: PDF attached. Password reset: link not stored.
- Bodies are stored for retry except secret links; `GET /api/cron/email-retry` retries failed rows (max 3 attempts).
- HTML and plain-text versions; all dynamic values are HTML-escaped.
- Settings > Email has a **test email** button.
