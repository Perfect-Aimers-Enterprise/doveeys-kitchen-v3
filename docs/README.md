# DOVEEYS KITCHEN: backend, administrator dashboard and storefront

Next.js 15 (App Router) · TypeScript · Tailwind 4 · PostgreSQL · Prisma 6 · Zod · Paystack · Cloudinary · Nodemailer · pdfkit.

## Set up
```bash
npm install
cp .env.example .env            # fill in every value, see ENVIRONMENT_VARIABLES.md
npx prisma generate
npx prisma migrate dev --name init   # or `prisma migrate deploy` on a server
npm run dev
```
Open `/admin/register`, create the first two administrator accounts with `ADMIN_SETUP_KEY`, then sign in.
Add meals under **Meals**, set delivery and email under **Settings**.

## Scripts
`npm run dev` · `npm run build` · `npm test` (unit) · `npm run test:integration` (needs a test database, see TESTING.md) · `npm run db:seed`.

## Documentation map
ARCHITECTURE · DATABASE_SCHEMA · API_REFERENCE · AUTHENTICATION · PAYMENT_INTEGRATION · WEBHOOKS · ORDER_LIFECYCLE · EMAIL_SYSTEM · CLOUDINARY · CONFIGURATION · DELIVERY_PRICING · REPORTING · DESIGN_SYSTEM · CUSTOMER_FRONTEND_INTEGRATION · SEO · ENVIRONMENT_VARIABLES · DEPLOYMENT · TESTING · CHANGELOG.

## Credits
Developed by Godsave Kawurem, Founder & CEO of GokaFood Technologies Limited. Portfolio: https://gktech.gokafood.com
