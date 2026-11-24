import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { siteConfig } from "@/config";
import { mergeLines, orderTotals, priceLine, PricingError } from "@/lib/pricing";
import { orderReference, paystackReference } from "@/lib/security/tokens";
import { initializeTransaction } from "@/lib/paystack/client";
import { toMinorUnits, toMoneyString } from "@/utils/money";
import type { CreateOrderInput } from "@/lib/validation/order";
import { quoteDelivery } from "./delivery.service";

/** Prices an order entirely on the server, stores an immutable snapshot, then opens a Paystack checkout. */
export async function createOrderAndInitializePayment(input: CreateOrderInput) {
  const lines = mergeLines(input.items);
  const meals = await db.meal.findMany({
    where: { id: { in: lines.map((l) => l.mealId) } },
    include: { options: true },
  });

  const priced = lines.map((line) => {
    const meal = meals.find((m) => m.id === line.mealId);
    if (!meal || meal.archivedAt)
      throw new AppError("MEAL_NOT_FOUND", "A meal in your cart is no longer on the menu.", 422);
    if (!meal.isAvailable)
      throw new AppError("MEAL_UNAVAILABLE", `${meal.name} is currently unavailable.`, 422);
    try {
      return priceLine(meal, line);
    } catch (e) {
      if (e instanceof PricingError) throw new AppError(e.code, e.message, 422);
      throw e;
    }
  });

  const subtotal = orderTotals(priced, 0).subtotal;
  const delivery = await quoteDelivery(input.delivery.zoneId, subtotal);
  const totals = orderTotals(priced, delivery.fee);

  let order;
  for (let attempt = 0; ; attempt++) {
    try {
      order = await db.order.create({
        data: {
          reference: orderReference(),
          customerName: input.customer.name,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          deliveryAddress: input.delivery.address,
          deliveryNotes: input.delivery.notes,
          deliveryZoneId: delivery.zone?.id,
          deliveryZoneName: delivery.zone?.name,
          subtotal: totals.subtotal.toFixed(2),
          deliveryFee: totals.deliveryFee.toFixed(2),
          total: totals.total.toFixed(2),
          currency: delivery.currency,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          items: {
            create: priced.map((l) => ({
              mealId: l.mealId,
              optionId: l.optionId,
              mealName: l.mealName,
              mealDescription: l.mealDescription,
              mealType: l.mealType,
              litres: l.litres?.toFixed(2),
              unitPrice: l.unitPrice.toFixed(2),
              quantity: l.quantity,
              lineTotal: l.lineTotal.toFixed(2),
            })),
          },
          history: {
            create: { fromStatus: null, toStatus: "PENDING_PAYMENT", note: "Order created" },
          },
        },
      });
      break;
    } catch (e) {
      if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        continue; // reference collision
      throw e;
    }
  }

  const reference = paystackReference();
  try {
    const init = await initializeTransaction({
      email: order.customerEmail,
      amount: toMinorUnits(order.total.toString()),
      currency: order.currency,
      reference,
      callback_url: `${siteConfig.appUrl}/checkout/complete`,
      metadata: { orderId: order.id, orderReference: order.reference },
    });
    await db.payment.create({
      data: {
        orderId: order.id,
        paystackReference: reference,
        amount: order.total.toString(),
        currency: order.currency,
        status: "PENDING",
      },
    });
    return {
      orderReference: order.reference,
      paymentReference: reference,
      subtotal: toMoneyString(order.subtotal.toString()),
      deliveryFee: toMoneyString(order.deliveryFee.toString()),
      total: toMoneyString(order.total.toString()),
      currency: order.currency,
      paystack: { authorizationUrl: init.authorization_url, accessCode: init.access_code },
    };
  } catch (e) {
    console.error("[order] paystack initialization failed", e);
    await db.order
      .update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          paymentStatus: "FAILED",
          history: {
            create: {
              fromStatus: "PENDING_PAYMENT",
              toStatus: "CANCELLED",
              note: "Payment could not be started",
            },
          },
        },
      })
      .catch(() => {});
    throw new AppError(
      "PAYMENT_INIT_FAILED",
      "We could not start the payment. Nothing was charged. Please try again.",
      502,
    );
  }
}
