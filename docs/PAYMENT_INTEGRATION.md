# Payment integration (Paystack)

1. `POST /api/public/orders` prices the cart on the server, stores the order (PENDING_PAYMENT) and calls Paystack *initialize* with the amount in kobo, a generated reference (`DKP-` + 24 hex) and the callback `{APP_URL}/checkout/complete`.
2. The customer pays on Paystack. The browser returns to `/checkout/complete` which calls `GET /api/public/payments/verify?reference=`; the webhook may arrive first or second.
3. `verifyAndApplyPayment(reference)` asks Paystack and requires: status `success`, same reference, same currency, amount equal to the stored order total in kobo. Anything else leaves the order unpaid (`mismatch`, `pending`, `failed`).
4. The payment row is *claimed* with a conditional update, so exactly one caller marks the order PAID, creates the tracking token (hash stored), writes history and sends emails. Concurrent verify/webhook calls are safe (tested).
5. If Paystack cannot be reached when starting a payment, the order is cancelled and `PAYMENT_INIT_FAILED` is returned.

Secret keys live only in environment variables. The browser redirect is never trusted. Default currency NGN (setting `business.currency`).

**Refunds**: Paystack's refund API is not integrated. Refund in the Paystack dashboard, then use *Record a refund* on the order so revenue and reports stay correct (partial or full; capped at the amount paid).
