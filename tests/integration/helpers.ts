import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL to an empty PostgreSQL test database that already has the schema.");
if (!/test/i.test(url)) throw new Error("Refusing to run: TEST_DATABASE_URL must contain 'test' so real data is never truncated.");

async function makeClient() {
  // In sandboxes without Prisma's native engine, TEST_USE_PG_ADAPTER=1 runs the same client through the pg driver adapter.
  if (process.env.TEST_USE_PG_ADAPTER) {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) } as never);
  }
  return new PrismaClient({ datasourceUrl: url });
}
export const testDb = await makeClient();

export async function resetDb() {
  await testDb.$executeRawUnsafe(`TRUNCATE "Admin","AdminAuditLog","DeliveryZone","EmailLog","Faq","Meal","MealCategory","Order","OrderItem","OrderStatusHistory","PasswordResetToken","Payment","RateLimit","ReportLog","Session","SiteSetting","SpecialMealOption","WebhookEvent" RESTART IDENTITY CASCADE`);
}

export const sign = (body: string, secret = "sk_test_integration") => createHmac("sha512", secret).update(body).digest("hex");

/** Paystack stand-in: initialization echoes the reference; verification returns whatever the test sets. */
export function installPaystack(vi: { stubGlobal: (k: string, v: unknown) => void; fn: (impl: (...a: any[]) => any) => any }) {
  const state: { verify: { status: string; amountOverride?: number; currencyOverride?: string; channel?: string }; initFails: boolean; verifyCalls: number } = { verify: { status: "success", channel: "card" }, initFails: false, verifyCalls: 0 };
  const initialised = new Map<string, { amount: number; currency: string }>();
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
    const res = (data: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => ({ status: ok, message: ok ? "ok" : "bad", data }) });
    if (url.endsWith("/transaction/initialize")) {
      if (state.initFails) return res(null, false);
      const b = JSON.parse(init!.body!);
      initialised.set(b.reference, { amount: b.amount, currency: b.currency });
      return res({ authorization_url: `https://checkout.paystack.test/${b.reference}`, access_code: "ac_1", reference: b.reference });
    }
    const m = url.match(/\/transaction\/verify\/(.+)$/);
    if (m) {
      state.verifyCalls++;
      const ref = decodeURIComponent(m[1]); const i = initialised.get(ref) ?? { amount: 0, currency: "NGN" };
      return res({ id: 4242, status: state.verify.status, reference: ref, amount: state.verify.amountOverride ?? i.amount, currency: state.verify.currencyOverride ?? i.currency, channel: state.verify.channel });
    }
    return res(null, false);
  }));
  return state;
}
