import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPaystackSignature } from "@/lib/paystack/signature";
import { verifyAndApplyPayment } from "@/services/payment.service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // The signature covers the exact bytes Paystack sent, so read the raw text before any JSON parsing.
  const raw = await req.text();
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"), secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: { event?: string; data?: { id?: number; reference?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const reference = event.data?.reference;
  const eventKey = `${event.event}:${event.data?.id ?? reference}`;
  if (!event.event || !reference) return NextResponse.json({ ok: true, ignored: true });

  // Idempotency ledger: a duplicate delivery hits the unique key and is acknowledged without reprocessing.
  try { await db.webhookEvent.create({ data: { eventKey, type: event.event } }); }
  catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ ok: true, duplicate: true });
    throw e;
  }

  if (event.event !== "charge.success") {
    await db.webhookEvent.update({ where: { eventKey }, data: { processedAt: new Date() } });
    return NextResponse.json({ ok: true, ignored: true });
  }
  try {
    await verifyAndApplyPayment(reference); // re-verifies with Paystack: the webhook body is never trusted for amounts or status
    await db.webhookEvent.update({ where: { eventKey }, data: { processedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook] processing failed", e);
    await db.webhookEvent.delete({ where: { eventKey } }).catch(() => {}); // let Paystack's retry reprocess it
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
