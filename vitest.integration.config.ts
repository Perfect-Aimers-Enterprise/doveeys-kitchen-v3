import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Runs the real services against a real PostgreSQL database. Set TEST_DATABASE_URL to an EMPTY test database that already has the schema
// (npx prisma migrate deploy). The database is truncated before every test: never point this at real data.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"], fileParallelism: false, testTimeout: 60000, hookTimeout: 60000,
    env: {
      NEXT_PUBLIC_APP_URL: "https://doveeys.test", PAYSTACK_SECRET_KEY: "sk_test_integration", ADMIN_SETUP_KEY: "setup-key-for-tests", CRON_SECRET: "cron-secret",
      DEFAULT_ADMIN_EMAIL: "owner@doveeys.test", SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_FROM_EMAIL: "noreply@doveeys.test", SMTP_FROM_NAME: "DOVEEYS KITCHEN",
    },
  },
});
