# Database schema (PostgreSQL, Prisma)

Source of truth: `prisma/schema.prisma`. Money columns are `DECIMAL(12,2)`; code uses decimal.js, never floats.

| Model | Purpose | Key fields / constraints |
|---|---|---|
| Admin | Dashboard users (max 2) | `email` unique, `passwordHash` (Argon2id), `role` OWNER/ADMIN, `failedLogins`, `lockedUntil` |
| Session | Login sessions | `tokenHash` unique (SHA-256), `expiresAt` |
| PasswordResetToken | One-time reset links | `tokenHash` unique, `expiresAt`, `usedAt` |
| RateLimit | Fixed-window limiter | `key` PK, `count`, `resetAt` |
| MealCategory | Menu groups | `slug` unique, `sortOrder`, `archivedAt` |
| Meal | Menu items | `slug` unique, `type` NORMAL/SPECIAL, `basePrice` (normal only), image URL + public id, `isAvailable`, `isFeatured`, `sortOrder`, `archivedAt` (soft delete) |
| SpecialMealOption | Litre sizes of a special meal | unique (`mealId`,`litres`), `price`, `sortOrder`; number of options is unlimited |
| DeliveryZone | Optional priced areas | `name` unique, `fee`, `isActive` |
| Order | A customer order | `reference` unique, customer + delivery details, `subtotal`, `deliveryFee`, `total`, `currency`, `paymentStatus`, `status`, `trackingTokenHash` unique, `paidAt` |
| OrderItem | Snapshot of what was bought | `mealName`, `mealDescription`, `mealType`, `litres`, `unitPrice`, `quantity`, `lineTotal`; `mealId`/`optionId` are nullable (SET NULL) |
| Payment | Paystack transaction | `paystackReference` unique, `amount`, `status`, `refundedAmount`, `rawVerification` JSON |
| WebhookEvent | Webhook idempotency ledger | `eventKey` unique |
| OrderStatusHistory | Every status change | `fromStatus`, `toStatus`, `adminId`, `note`, `createdAt` |
| SiteSetting | Owner overrides | `key` PK, JSON `value` |
| Faq | Ordered FAQs | `sortOrder` |
| EmailLog | Every email attempt | `status`, `attempts`, `error`, optional stored body (never for secret links) |
| ReportLog | Report sends | unique (`kind`,`periodStart`), `status` |
| AdminAuditLog | Administrator actions | `action`, `entity`, `entityId`, `metadata` |

## Enums
`AdminRole` OWNER ADMIN · `MealType` NORMAL SPECIAL · `PaymentStatus` PENDING SUCCESSFUL FAILED REFUNDED · `OrderStatus` PENDING_PAYMENT PAID CONFIRMED PROCESSING READY OUT_FOR_DELIVERY DELIVERED CANCELLED · `EmailStatus` · `ReportKind` WEEKLY MONTHLY · `ReportStatus`.

## Historical pricing
Changing a price, archiving a meal, deleting a litre option or a delivery zone never changes an existing order: the order owns its snapshot. Verified by integration tests.
