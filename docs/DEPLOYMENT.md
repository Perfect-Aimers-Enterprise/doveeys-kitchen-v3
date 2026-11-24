# Deployment (Vercel)

1. Create a PostgreSQL database (Neon, Supabase, Vercel Postgres...). Set `DATABASE_URL` (pooled) and `DIRECT_URL`.
2. Set every variable in ENVIRONMENT_VARIABLES.md in the Vercel project. `NEXT_PUBLIC_APP_URL` must be the final https domain.
3. Migrate: `npx prisma migrate deploy` (run locally against the production URL, or as a build step). The build script runs `prisma generate`.
4. Deploy. Open `/admin/register` and create the two administrators; registration then closes itself.
5. Paystack: add `https://YOUR_DOMAIN/api/webhooks/paystack` as the webhook; use test keys first, make a test payment, confirm the order turns PAID and both emails arrive; then switch to live keys.
6. Cloudinary and SMTP: use Settings > Email > Send test, and upload a meal image.
7. **Scheduled jobs** (`vercel.json`): `/api/cron/reports` daily 06:00 UTC and `/api/cron/email-retry` daily 05:30 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET`. Hobby plans allow daily jobs only; Pro allows tighter schedules (for example `*/15 * * * *` for email retry).
8. Submit `/sitemap.xml` to Google Search Console.
Backups: enable your database provider's automated backups.
