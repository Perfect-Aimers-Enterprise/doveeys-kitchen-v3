import { beforeEach, describe, expect, it, vi } from "vitest";
import { installPaystack, resetDb, sign, testDb } from "./helpers";

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers")).testDb }));
const sent: { to: unknown; subject: string; text: string; html: string; attachments?: { filename: string; content: Buffer }[] }[] = [];
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: async (m: any) => { sent.push(m); } }) } }));

const paystack = installPaystack(vi);
const { createMeal, updateMeal, setMealArchived, listAdminMeals, saveZone } = await import("@/services/meal-admin.service");
const { listPublicMeals, getPublicMeal } = await import("@/services/catalog.service");
const { createOrderAndInitializePayment } = await import("@/services/order.service");
const { verifyAndApplyPayment } = await import("@/services/payment.service");
const { changeOrderStatus } = await import("@/services/order-admin.service");
const { recordRefund, listOrders } = await import("@/services/order-query.service");
const { getAnalytics } = await import("@/services/analytics.service");
const { listCustomers } = await import("@/services/customer.service");
const { getTrackingView } = await import("@/services/tracking.service");
const { setSetting, getSetting, clearSetting, saveSettings, invalidateSettingsCache } = await import("@/services/settings.service");
const { sendReport } = await import("@/services/report.service");
const { mealSchema } = await import("@/lib/validation/meal");
const { POST: webhook } = await import("@/app/api/webhooks/paystack/route");
const { GET: cronReports } = await import("@/app/api/cron/reports/route");
const { GET: cronRetry } = await import("@/app/api/cron/email-retry/route");

let adminId = "";
const customer = { name: "Ada Obi", email: "ada@example.com", phone: "+234 801 234 5678" };
const mk = (o: Record<string, unknown>) => mealSchema.parse({ description: "A tasty meal", ...o });

async function seedMeals() {
  const normal = await createMeal(mk({ name: "Jollof Rice", type: "NORMAL", basePrice: "5000.50" }), adminId);
  const special = await createMeal(mk({ name: "Pepper Soup", type: "SPECIAL", options: [{ litres: "1", price: "12000" }, { litres: "2", price: "23000" }] }), adminId);
  const full = await testDb.meal.findUniqueOrThrow({ where: { id: special.id }, include: { options: { orderBy: { litres: "asc" } } } });
  return { normal, special: full };
}
const order = (items: any[], delivery: any = {}) => createOrderAndInitializePayment({ items, customer, delivery: { address: "12 Example Street", ...delivery } });
const get = (ref: string) => testDb.payment.findUniqueOrThrow({ where: { paystackReference: ref }, include: { order: { include: { items: true, history: true } } } });

beforeEach(async () => {
  await resetDb(); invalidateSettingsCache(); sent.length = 0;
  paystack.verify = { status: "success", channel: "card" }; paystack.initFails = false; paystack.verifyCalls = 0;
  adminId = (await testDb.admin.create({ data: { email: "owner@doveeys.test", name: "Owner", passwordHash: "x", role: "OWNER" } })).id;
});

describe("meals and historical pricing", () => {
  it("creates normal and special meals with litre options, and hides archived meals from the public menu", async () => {
    const { normal, special } = await seedMeals();
    expect(special.options.map((o) => o.litres.toString())).toEqual(["1", "2"]);
    expect((await listPublicMeals({})).map((m) => m.name).sort()).toEqual(["Jollof Rice", "Pepper Soup"]);
    const pub = await getPublicMeal("pepper-soup");
    expect(pub).toMatchObject({ type: "SPECIAL", price: null, options: [{ litres: "1", price: "12000.00" }, { litres: "2", price: "23000.00" }] });
    await setMealArchived(normal.id, true, adminId);
    expect((await listPublicMeals({})).map((m) => m.name)).toEqual(["Pepper Soup"]);
    expect(await getPublicMeal("jollof-rice")).toBeNull();
    expect(await listAdminMeals({ status: "archived" })).toHaveLength(1);
  });
  it("edits litre options in place: update, add and remove, without touching old orders", async () => {
    const { special } = await seedMeals();
    const placed = await order([{ mealId: special.id, optionId: special.options[1].id, quantity: 1 }]);
    const before = await get(placed.paymentReference);
    await updateMeal(special.id, mk({ name: "Pepper Soup", type: "SPECIAL", options: [{ id: special.options[0].id, litres: "1", price: "15000" }, { litres: "5", price: "50000" }] }), adminId);
    const opts = await testDb.specialMealOption.findMany({ where: { mealId: special.id }, orderBy: { litres: "asc" } });
    expect(opts.map((o) => [o.litres.toString(), o.price.toString()])).toEqual([["1", "15000"], ["5", "50000"]]);
    const after = await get(placed.paymentReference); // the removed 2-litre option no longer exists, but the order snapshot is intact
    expect(after.order.items[0]).toMatchObject({ mealName: "Pepper Soup", unitPrice: before.order.items[0].unitPrice, optionId: null });
    expect(after.order.items[0].litres?.toString()).toBe("2");
    expect(after.order.total.toString()).toBe(before.order.total.toString());
  });
  it("keeps the original price on existing orders after a price change or archive", async () => {
    const { normal } = await seedMeals();
    const placed = await order([{ mealId: normal.id, quantity: 2 }]);
    await updateMeal(normal.id, mk({ name: "Jollof Rice", type: "NORMAL", basePrice: "9999" }), adminId);
    await setMealArchived(normal.id, true, adminId);
    const p = await get(placed.paymentReference);
    expect(p.order.items[0].unitPrice.toString()).toBe("5000.5");
    expect(p.order.items[0].lineTotal.toString()).toBe("10001");
  });
  it("rejects reserved web addresses", () => {
    expect(mealSchema.safeParse({ name: "X", description: "A tasty meal", type: "NORMAL", basePrice: "1", slug: "special" }).success).toBe(false);
  });
});

describe("order creation: the server decides every price", () => {
  it("prices from the database, snapshots items and starts as pending payment", async () => {
    const { normal, special } = await seedMeals();
    const r = await order([{ mealId: normal.id, quantity: 2 }, { mealId: special.id, optionId: special.options[1].id, quantity: 1 }]);
    expect(r).toMatchObject({ subtotal: "33001.00", deliveryFee: "0.00", total: "33001.00", currency: "NGN" });
    expect(r.paystack.authorizationUrl).toContain(r.paymentReference);
    const p = await get(r.paymentReference);
    expect(p.order).toMatchObject({ status: "PENDING_PAYMENT", paymentStatus: "PENDING", trackingTokenHash: null });
    expect(p.amount.toString()).toBe("33001");
    expect(p.order.items.map((i) => [i.mealName, i.litres?.toString() ?? null, i.quantity])).toEqual(expect.arrayContaining([["Jollof Rice", null, 2], ["Pepper Soup", "2", 1]]));
    expect(p.order.history[0].toStatus).toBe("PENDING_PAYMENT");
  });
  it("uses the owner-editable default fee, zone fees and the free-delivery threshold", async () => {
    const { normal } = await seedMeals();
    await setSetting("delivery.defaultFee", "1500", adminId);
    expect((await order([{ mealId: normal.id, quantity: 1 }])).deliveryFee).toBe("1500.00");
    await setSetting("delivery.freeThreshold", "10000", adminId);
    expect((await order([{ mealId: normal.id, quantity: 2 }])).deliveryFee).toBe("0.00");
    const z = await saveZone(null, { name: "Island", fee: "3000", isActive: true }, adminId);
    await expect(order([{ mealId: normal.id, quantity: 1 }])).rejects.toMatchObject({ code: "DELIVERY_ZONE_REQUIRED" });
    expect((await order([{ mealId: normal.id, quantity: 1 }], { zoneId: z.id })).deliveryFee).toBe("3000.00");
    await clearSetting("delivery.defaultFee", adminId); await clearSetting("delivery.freeThreshold", adminId);
    expect(await getSetting("delivery.defaultFee")).toBe("0.00"); // back to the config-file default
  });
  it("rejects unavailable, archived, unknown and mismatched items", async () => {
    const { normal, special } = await seedMeals();
    await expect(order([{ mealId: special.id, quantity: 1 }])).rejects.toMatchObject({ code: "OPTION_REQUIRED" });
    await expect(order([{ mealId: normal.id, optionId: special.options[0].id, quantity: 1 }])).rejects.toMatchObject({ code: "INVALID_OPTION" });
    await expect(order([{ mealId: "nope", quantity: 1 }])).rejects.toMatchObject({ code: "MEAL_NOT_FOUND" });
    await testDb.meal.update({ where: { id: normal.id }, data: { isAvailable: false } });
    await expect(order([{ mealId: normal.id, quantity: 1 }])).rejects.toMatchObject({ code: "MEAL_UNAVAILABLE" });
  });
  it("cancels the order and reports a clear error when Paystack cannot start the payment", async () => {
    const { normal } = await seedMeals();
    paystack.initFails = true;
    await expect(order([{ mealId: normal.id, quantity: 1 }])).rejects.toMatchObject({ code: "PAYMENT_INIT_FAILED" });
    expect(await testDb.order.findFirstOrThrow()).toMatchObject({ status: "CANCELLED", paymentStatus: "FAILED" });
    expect(await testDb.payment.count()).toBe(0);
  });
});

describe("payment verification, tracking and emails", () => {
  it("marks the order paid once, creates a hashed tracking token and sends both emails", async () => {
    const { normal } = await seedMeals();
    const r = await order([{ mealId: normal.id, quantity: 1 }]);
    const out = await verifyAndApplyPayment(r.paymentReference);
    expect(out).toMatchObject({ state: "paid", newlyPaid: true, orderReference: r.orderReference });
    const p = await get(r.paymentReference);
    expect(p).toMatchObject({ status: "SUCCESSFUL", channel: "card" });
    expect(p.order).toMatchObject({ status: "PAID", paymentStatus: "SUCCESSFUL" });
    expect(p.order.paidAt).toBeTruthy(); expect(p.order.trackingTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(p.order.history.map((h) => h.toStatus)).toEqual(expect.arrayContaining(["PENDING_PAYMENT", "PAID"]));
    expect(sent).toHaveLength(2);
    const customerMail = sent.find((m) => m.to === customer.email)!, adminMail = sent.find((m) => String(m.to).includes("owner@doveeys.test"))!;
    expect(customerMail.text).toMatch(/https:\/\/doveeys\.test\/track\/[\w-]{43}/);
    expect(adminMail.text).toContain(`/admin/orders/${p.orderId}`);
    expect(adminMail.text).toContain(customer.phone);
    const token = customerMail.text.match(/\/track\/([\w-]+)/)![1];
    expect(p.order.trackingTokenHash).not.toBe(token);
    const view = await getTrackingView(token);
    expect(view).toMatchObject({ orderReference: r.orderReference, status: "PAID", customerFirstName: "Ada" });
    const json = JSON.stringify(view);
    for (const secret of [customer.email, customer.phone, "12 Example Street"]) expect(json).not.toContain(secret);
    expect(await getTrackingView("A".repeat(43))).toBeNull();
    expect((await testDb.emailLog.findMany({ where: { template: "order-confirmation" } }))[0].bodyHtml).toBeNull(); // tracking link is never stored
  });
  it("is idempotent under concurrent verification: one transition, two emails in total", async () => {
    const { normal } = await seedMeals();
    const r = await order([{ mealId: normal.id, quantity: 1 }]);
    const outs = await Promise.all([1, 2, 3, 4].map(() => verifyAndApplyPayment(r.paymentReference)));
    expect(outs.filter((o) => o.state === "paid" && (o as any).newlyPaid)).toHaveLength(1);
    expect(outs.every((o) => o.state === "paid")).toBe(true);
    expect(sent).toHaveLength(2);
    expect((await get(r.paymentReference)).order.history.filter((h) => h.toStatus === "PAID")).toHaveLength(1);
    expect(await verifyAndApplyPayment(r.paymentReference)).toMatchObject({ state: "paid", newlyPaid: false });
  });
  it("refuses wrong amounts, wrong currency, pending and failed payments", async () => {
    const { normal } = await seedMeals();
    const a = await order([{ mealId: normal.id, quantity: 1 }]);
    paystack.verify = { status: "success", amountOverride: 100 };
    expect((await verifyAndApplyPayment(a.paymentReference)).state).toBe("mismatch");
    paystack.verify = { status: "success", currencyOverride: "USD" };
    expect((await verifyAndApplyPayment(a.paymentReference)).state).toBe("mismatch");
    paystack.verify = { status: "abandoned" };
    expect((await verifyAndApplyPayment(a.paymentReference)).state).toBe("pending");
    expect(await testDb.order.findFirstOrThrow()).toMatchObject({ status: "PENDING_PAYMENT", paymentStatus: "PENDING" });
    paystack.verify = { status: "failed" };
    expect((await verifyAndApplyPayment(a.paymentReference)).state).toBe("failed");
    expect(await testDb.order.findFirstOrThrow()).toMatchObject({ paymentStatus: "FAILED", status: "PENDING_PAYMENT" });
    expect(sent).toHaveLength(0);
    await expect(verifyAndApplyPayment("DKP-" + "0".repeat(24))).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });
  });
  it("does not undo a confirmed payment when email fails, and the cron retry delivers it later", async () => {
    const { normal } = await seedMeals();
    const r = await order([{ mealId: normal.id, quantity: 1 }]);
    const orig = process.env.SMTP_HOST; delete process.env.SMTP_HOST;
    await verifyAndApplyPayment(r.paymentReference);
    expect((await get(r.paymentReference)).order.status).toBe("PAID");
    const failed = await testDb.emailLog.findMany({ where: { status: "FAILED" } });
    expect(failed.length).toBeGreaterThan(0); expect(failed[0].error).toMatch(/not configured/);
    process.env.SMTP_HOST = orig;
    const res = await cronRetry(new Request("https://x.test/api/cron/email-retry", { headers: { authorization: "Bearer cron-secret" } }));
    expect(res.status).toBe(200);
    expect(sent.some((m) => String(m.to).includes("owner@doveeys.test"))).toBe(true); // admin email had a stored body and was retried
  });
});

describe("Paystack webhook", () => {
  const body = (ref: string, id = 777) => JSON.stringify({ event: "charge.success", data: { id, reference: ref } });
  const hit = (raw: string, sig: string | null) => webhook(new Request("https://x.test/api/webhooks/paystack", { method: "POST", body: raw, headers: sig ? { "x-paystack-signature": sig } : {} }));

  it("rejects missing or invalid signatures without touching the order", async () => {
    const { normal } = await seedMeals(); const r = await order([{ mealId: normal.id, quantity: 1 }]);
    expect((await hit(body(r.paymentReference), null)).status).toBe(401);
    expect((await hit(body(r.paymentReference), sign(body(r.paymentReference), "wrong-secret"))).status).toBe(401);
    expect((await get(r.paymentReference)).order.status).toBe("PENDING_PAYMENT");
    expect(await testDb.webhookEvent.count()).toBe(0);
  });
  it("verifies with Paystack, pays the order, and acknowledges duplicate deliveries without reprocessing", async () => {
    const { normal } = await seedMeals(); const r = await order([{ mealId: normal.id, quantity: 1 }]);
    const raw = body(r.paymentReference);
    const first = await hit(raw, sign(raw));
    expect(await first.json()).toEqual({ ok: true });
    expect((await get(r.paymentReference)).order.status).toBe("PAID");
    const dup = await hit(raw, sign(raw));
    expect(await dup.json()).toEqual({ ok: true, duplicate: true });
    expect(sent).toHaveLength(2);
    expect(await testDb.webhookEvent.count()).toBe(1);
  });
  it("never trusts the webhook body: a forged success for an unpaid reference is re-verified and refused", async () => {
    const { normal } = await seedMeals(); const r = await order([{ mealId: normal.id, quantity: 1 }]);
    paystack.verify = { status: "abandoned" };
    const raw = body(r.paymentReference, 888);
    expect((await hit(raw, sign(raw))).status).toBe(200);
    expect((await get(r.paymentReference)).order.status).toBe("PENDING_PAYMENT");
  });
  it("lets Paystack retry after a processing failure by removing the idempotency record", async () => {
    const { normal } = await seedMeals(); const r = await order([{ mealId: normal.id, quantity: 1 }]);
    const raw = body(r.paymentReference, 999);
    const real = (globalThis.fetch as any);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect((await hit(raw, sign(raw))).status).toBe(500);
    expect(await testDb.webhookEvent.count()).toBe(0);
    vi.stubGlobal("fetch", real);
    expect((await hit(raw, sign(raw))).status).toBe(200);
    expect((await get(r.paymentReference)).order.status).toBe("PAID");
  });
});

describe("order management", () => {
  async function paid() { const { normal } = await seedMeals(); const r = await order([{ mealId: normal.id, quantity: 2 }]); await verifyAndApplyPayment(r.paymentReference); sent.length = 0; return (await get(r.paymentReference)).orderId; }

  it("walks the full lifecycle, records who changed what, and emails the customer at each step", async () => {
    const id = await paid();
    for (const s of ["CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] as const) await changeOrderStatus(id, s, adminId, `to ${s}`);
    const h = await testDb.orderStatusHistory.findMany({ where: { orderId: id, adminId: { not: null } }, orderBy: { createdAt: "asc" } });
    expect(h.map((x) => [x.fromStatus, x.toStatus])).toEqual([["PAID", "CONFIRMED"], ["CONFIRMED", "PROCESSING"], ["PROCESSING", "READY"], ["READY", "OUT_FOR_DELIVERY"], ["OUT_FOR_DELIVERY", "DELIVERED"]]);
    expect(h.every((x) => x.adminId === adminId)).toBe(true);
    expect(sent.map((m) => m.subject).join("|")).toMatch(/delivered/i);
    expect(sent).toHaveLength(5);
  });
  it("blocks skipping steps, reopening, and any change on an unpaid order", async () => {
    const id = await paid();
    await expect(changeOrderStatus(id, "DELIVERED", adminId)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await changeOrderStatus(id, "CANCELLED", adminId);
    await expect(changeOrderStatus(id, "CONFIRMED", adminId)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const { normal } = await seedMeals().catch(async () => ({ normal: await testDb.meal.findFirstOrThrow() }));
    const unpaid = await order([{ mealId: normal.id, quantity: 1 }]);
    const uid = (await get(unpaid.paymentReference)).orderId;
    for (const to of ["CONFIRMED", "DELIVERED", "PAID"] as const) await expect(changeOrderStatus(uid, to, adminId)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await testDb.order.findUniqueOrThrow({ where: { id: uid } })).status).toBe("PENDING_PAYMENT");
  });
  it("only one of two simultaneous status changes wins", async () => {
    const id = await paid();
    const r = await Promise.allSettled([changeOrderStatus(id, "CONFIRMED", adminId), changeOrderStatus(id, "CONFIRMED", adminId)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await testDb.orderStatusHistory.count({ where: { orderId: id, toStatus: "CONFIRMED" } })).toBe(1);
  });
  it("records partial and full refunds, caps them at the amount paid, and flows into net revenue", async () => {
    const id = await paid(); // 2 x 5000.50 = 10001.00
    await expect(recordRefund(id, "20000", undefined, adminId)).rejects.toMatchObject({ code: "INVALID_REFUND" });
    expect(await recordRefund(id, "1001", "late", adminId)).toMatchObject({ refunded: "1001.00", remaining: "9000.00", full: false });
    expect((await testDb.order.findUniqueOrThrow({ where: { id } })).paymentStatus).toBe("SUCCESSFUL");
    const from = new Date(Date.now() - 864e5), to = new Date(Date.now() + 864e5);
    let a = await getAnalytics(from, to, "Africa/Lagos");
    expect(a).toMatchObject({ grossRevenue: "10001.00", refunds: "1001.00", netRevenue: "9000.00" });
    await recordRefund(id, "9000", undefined, adminId);
    expect((await testDb.order.findUniqueOrThrow({ where: { id } })).paymentStatus).toBe("REFUNDED");
    a = await getAnalytics(from, to, "Africa/Lagos");
    expect(a).toMatchObject({ grossRevenue: "10001.00", refunds: "10001.00", netRevenue: "0.00", successfulPayments: 1 });
  });
});

describe("analytics, customers and filters from real rows", () => {
  it("computes every figure from orders, with unpaid and cancelled orders kept out of revenue", async () => {
    const { normal, special } = await seedMeals();
    const pay = async (items: any[]) => { const r = await order(items); await verifyAndApplyPayment(r.paymentReference); return (await get(r.paymentReference)).orderId; };
    const o1 = await pay([{ mealId: normal.id, quantity: 2 }]);                                    // 10001.00
    await pay([{ mealId: special.id, optionId: special.options[1].id, quantity: 1 }]);              // 23000.00
    await order([{ mealId: normal.id, quantity: 1 }]);                                              // abandoned
    await changeOrderStatus(o1, "CONFIRMED", adminId); await changeOrderStatus(o1, "PROCESSING", adminId); await changeOrderStatus(o1, "READY", adminId);
    await changeOrderStatus(o1, "OUT_FOR_DELIVERY", adminId); await changeOrderStatus(o1, "DELIVERED", adminId);
    const a = await getAnalytics(new Date(Date.now() - 864e5), new Date(Date.now() + 864e5), "Africa/Lagos");
    expect(a).toMatchObject({ grossRevenue: "33001.00", successfulPayments: 2, ordersPlaced: 3, deliveredOrders: 1, pendingFulfilment: 1, cancelledOrders: 0, averageOrderValue: "16500.50", normalRevenue: "10001.00", specialRevenue: "23000.00" });
    expect(a.bestSellers[0]).toMatchObject({ name: "Jollof Rice", quantity: 2 });
    expect(a.litreDistribution).toEqual([{ litres: "2", quantity: 1, revenue: "23000.00" }]);
    expect(a.statusDistribution.find((s) => s.status === "PENDING_PAYMENT")?.count).toBe(1);
    expect(a.trend.reduce((s, d) => s + Number(d.revenue), 0)).toBe(33001);
    expect(a.trend.reduce((s, d) => s + d.orders, 0)).toBe(2);
    const c = await listCustomers({});
    expect(c.customers).toEqual([expect.objectContaining({ email: "ada@example.com", name: "Ada Obi", orders: 2, spent: "33001.00" })]);
    expect((await listCustomers({ q: "nobody" })).total).toBe(0);
    expect((await listOrders({ status: "PENDING_PAYMENT" })).total).toBe(1);
    expect((await listOrders({ payment: "SUCCESSFUL" })).total).toBe(2);
    expect((await listOrders({ q: "ada@example" })).total).toBe(3);
    expect((await listOrders({ from: new Date(Date.now() + 864e5) })).total).toBe(0);
  });
});

describe("settings overrides", () => {
  it("applies a saved value, falls back to the config default when cleared, and validates input", async () => {
    expect(await getSetting("reports.timezone")).toBe("Africa/Lagos");
    await saveSettings({ "reports.timezone": "Europe/London", "notify.recipients": ["a@x.co", "b@x.co"] }, adminId);
    expect(await getSetting("reports.timezone")).toBe("Europe/London");
    expect(await getSetting("notify.recipients")).toEqual(["a@x.co", "b@x.co"]);
    await saveSettings({ "reports.timezone": null }, adminId);
    expect(await getSetting("reports.timezone")).toBe("Africa/Lagos");
    await expect(saveSettings({ "reports.timezone": "Not/AZone" }, adminId)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(saveSettings({ "delivery.defaultFee": "12abc" }, adminId)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(saveSettings({ "not.a.setting": "x" }, adminId)).rejects.toMatchObject({ code: "UNKNOWN_SETTING" });
    expect(await testDb.adminAuditLog.count({ where: { action: { startsWith: "setting." } } })).toBeGreaterThan(0);
  });
});

describe("PDF reports and cron", () => {
  const period = () => ({ kind: "WEEKLY" as const, from: new Date(Date.now() - 864e5), to: new Date(Date.now() + 864e5) });
  it("emails a real PDF once per period, skips duplicates, and resends only when forced", async () => {
    const { normal } = await seedMeals(); const r = await order([{ mealId: normal.id, quantity: 1 }]); await verifyAndApplyPayment(r.paymentReference); sent.length = 0;
    const p = period();
    expect(await sendReport(p)).toMatchObject({ sent: true, recipients: ["owner@doveeys.test"] });
    expect(sent).toHaveLength(1);
    const pdf = sent[0].attachments![0];
    expect(pdf.filename).toMatch(/weekly.*\.pdf$/); expect(pdf.content.subarray(0, 5).toString()).toBe("%PDF-");
    expect(sent[0].text).toContain("5,000.50");
    expect(await sendReport(p)).toMatchObject({ sent: false, reason: "already-sent" });
    expect(sent).toHaveLength(1);
    expect(await sendReport(p, { force: true })).toMatchObject({ sent: true });
    expect(sent).toHaveLength(2);
    expect(await testDb.reportLog.count()).toBe(1);
  });
  it("sends only once even when triggered at the same time", async () => {
    const p = period();
    const r = await Promise.allSettled([sendReport(p), sendReport(p), sendReport(p)]);
    const sentOnes = r.filter((x) => x.status === "fulfilled" && (x.value as any).sent);
    expect(sentOnes).toHaveLength(1); expect(sent).toHaveLength(1);
  });
  it("records a failure when nobody can receive the report", async () => {
    await saveSettings({ "notify.recipients": [], "reports.recipients": [] }, adminId);
    await expect(sendReport(period())).rejects.toMatchObject({ code: "NO_RECIPIENTS" });
    expect(await testDb.reportLog.findFirstOrThrow()).toMatchObject({ status: "FAILED" });
  });
  it("protects cron endpoints with the secret", async () => {
    expect((await cronReports(new Request("https://x.test/api/cron/reports"))).status).toBe(401);
    expect((await cronReports(new Request("https://x.test/api/cron/reports", { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    const ok = await cronReports(new Request("https://x.test/api/cron/reports", { headers: { authorization: "Bearer cron-secret" } }));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(Object.keys(body.data.results).sort()).toEqual(["MONTHLY", "WEEKLY"]);
  });
});
