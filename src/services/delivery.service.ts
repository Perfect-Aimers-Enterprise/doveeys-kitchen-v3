import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { resolveDeliveryFee } from "@/lib/pricing";
import { toMoneyString } from "@/utils/money";
import { getSetting } from "./settings.service";

export async function listActiveZones() {
  return db.deliveryZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

/**
 * The only place a delivery fee is decided. If active zones exist the customer must pick one;
 * otherwise the (owner-editable) default fee applies. A free-delivery threshold overrides both.
 */
export async function quoteDelivery(zoneId: string | null | undefined, subtotal: string | { toString(): string }) {
  const [zones, defaultFee, freeThreshold, currency] = await Promise.all([
    listActiveZones(), getSetting("delivery.defaultFee"), getSetting("delivery.freeThreshold"), getSetting("business.currency"),
  ]);
  let zone: (typeof zones)[number] | null = null;
  if (zones.length > 0) {
    zone = zones.find((z) => z.id === zoneId) ?? null;
    if (!zone) throw new AppError("DELIVERY_ZONE_REQUIRED", "Choose a delivery area.", 422, { "delivery.zoneId": "Choose a delivery area." });
  } else if (zoneId) {
    throw new AppError("INVALID_ZONE", "That delivery area is not available.", 422, { "delivery.zoneId": "Not available" });
  }
  const fee = resolveDeliveryFee({ zoneFee: zone?.fee ?? null, defaultFee, freeThreshold, subtotal: subtotal.toString() });
  return { fee, feeString: toMoneyString(fee), currency, zone: zone ? { id: zone.id, name: zone.name } : null, freeThreshold };
}
