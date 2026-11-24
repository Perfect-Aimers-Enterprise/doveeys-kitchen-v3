# Authentication

- **Registration**: only with `ADMIN_SETUP_KEY` (constant-time check). Runs in a transaction holding `LOCK TABLE "Admin" IN EXCLUSIVE MODE`, so concurrent requests cannot exceed **two** accounts. The first becomes OWNER. After two accounts, registration returns `REGISTRATION_CLOSED` and the page shows a closed notice. There is no customer registration.
- **Passwords**: Argon2id. Policy: 12+ characters with upper case, lower case and a digit.
- **Login**: same error for unknown email and wrong password (with a dummy hash check to equalise timing). Five failures lock the account for 15 minutes. Rate limits: 30 per IP and 10 per email per 15 minutes.
- **Sessions**: 7 days; random 256-bit token in an HTTP-only, SameSite=Lax cookie (`Secure` in production); only its SHA-256 hash is stored.
- **Password reset**: emailed one-time link valid 60 minutes; resetting signs out every session. The email body is never stored.
- **Authorization**: `requireAdmin()` in every admin API handler (via `adminRoute`) and `requireAdminPage()` in the protected layout. Middleware only redirects early.
- **CSRF**: SameSite=Lax cookies plus an `Origin` check on all state-changing admin requests.
- **Deep links**: `/admin/orders/{id}` redirects to `/admin/login?next=...`; after login the admin returns to the order. `next` must start with `/admin/` and is checked for open-redirect tricks.
