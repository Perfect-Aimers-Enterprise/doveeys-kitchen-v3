# Order lifecycle

Payment status (`PENDING`, `SUCCESSFUL`, `FAILED`, `REFUNDED`) is separate from fulfilment status.

`PENDING_PAYMENT` -> (verified payment only) -> `PAID` -> `CONFIRMED` -> `PROCESSING` -> `READY` -> `OUT_FOR_DELIVERY` -> `DELIVERED`
`CANCELLED` is allowed from PAID, CONFIRMED, PROCESSING and READY. DELIVERED and CANCELLED are final.

Rules (`src/lib/order-status.ts`): an unpaid order can never be confirmed, processed or delivered; steps cannot be skipped or reopened; every change records previous status, new status, administrator and time; concurrent changes are guarded so only one wins. The customer is emailed at CONFIRMED, PROCESSING, READY, OUT_FOR_DELIVERY, DELIVERED and CANCELLED. Cancelling a paid order does not refund automatically.
