# Webhooks

`POST /api/webhooks/paystack`. Set this URL in the Paystack dashboard (shown with a copy button under Settings > Payments).

1. Read the **raw body**; compute HMAC SHA-512 with `PAYSTACK_SECRET_KEY`; compare with `x-paystack-signature` using `timingSafeEqual`. Invalid or missing: `401`, nothing stored.
2. Insert `WebhookEvent(eventKey = event:id)`; a unique-key conflict means a duplicate: reply `200 {duplicate:true}` without reprocessing.
3. Only `charge.success` is acted on, and it is **re-verified with Paystack**; amounts and status in the webhook body are never trusted.
4. On a processing failure the ledger row is removed and `500` is returned so Paystack retries.
Not handled yet: refund events (record refunds manually).
