import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { brandConfig, businessConfig, contactConfig, emailConfig, footerConfig, reportsConfig, siteConfig, themeConfig } from "@/config";

/**
 * Resolution order: 1) saved database override  2) config-file default  3) safe fallback.
 * Clearing an override deletes the row, which restores the config default.
 */
const recipients = z.array(z.string().trim().toLowerCase().email());
const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
const text = (max: number) => z.string().trim().max(max);
const url = z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\//.test(v) || v.startsWith("/"), "Use a full link starting with https://");

export const settingDefs = {
  // Delivery
  "delivery.defaultFee": { schema: money, fallback: "0.00", config: () => businessConfig.delivery.defaultFee },
  "delivery.freeThreshold": { schema: money.nullable(), fallback: null, config: () => businessConfig.delivery.freeThreshold },
  "delivery.instructions": { schema: text(2000), fallback: "", config: () => businessConfig.delivery.instructions },
  // Business
  "business.currency": { schema: z.string().trim().length(3).toUpperCase(), fallback: "NGN", config: () => businessConfig.currency },
  "business.address": { schema: text(500), fallback: "", config: () => businessConfig.address },
  "business.about": { schema: text(10000), fallback: "", config: () => businessConfig.about },
  "business.ownerName": { schema: text(200), fallback: "", config: () => businessConfig.owner.name },
  "business.ownerBio": { schema: text(10000), fallback: "", config: () => businessConfig.owner.bio },
  "business.hours": { schema: z.array(z.object({ day: text(20), open: text(20), close: text(20) })).max(14), fallback: [] as { day: string; open: string; close: string }[], config: () => [...businessConfig.operatingHours] },
  // Brand and site
  "brand.name": { schema: text(80).min(1), fallback: "DOVEEYS KITCHEN", config: () => brandConfig.name },
  "brand.slogan": { schema: text(200), fallback: "", config: () => brandConfig.slogan },
  "brand.description": { schema: text(1000), fallback: "", config: () => brandConfig.description },
  "brand.logoUrl": { schema: url, fallback: "", config: () => brandConfig.logoUrl },
  "site.announcement": { schema: text(300), fallback: "", config: () => siteConfig.announcement },
  "footer.text": { schema: text(500), fallback: "", config: () => footerConfig.text },
  "theme.default": { schema: z.enum(["light", "dark", "system"]), fallback: "light", config: () => themeConfig.defaultTheme },
  // Contact and social
  "contact.email": { schema: text(254), fallback: "", config: () => contactConfig.email },
  "contact.phone": { schema: text(40), fallback: "", config: () => contactConfig.phone },
  "contact.whatsapp": { schema: text(40), fallback: "", config: () => contactConfig.whatsapp },
  "social.instagram": { schema: url, fallback: "", config: () => businessConfig.social.instagram },
  "social.facebook": { schema: url, fallback: "", config: () => businessConfig.social.facebook },
  "social.x": { schema: url, fallback: "", config: () => businessConfig.social.x },
  "social.tiktok": { schema: url, fallback: "", config: () => businessConfig.social.tiktok },
  // Email
  "notify.recipients": { schema: recipients, fallback: [] as string[], config: () => [...emailConfig.defaultNotificationRecipients] },
  // Reports
  "reports.timezone": { schema: z.string().trim().min(1).refine((tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }, "Unknown timezone"), fallback: "Africa/Lagos", config: () => reportsConfig.timezone },
  "reports.recipients": { schema: recipients, fallback: [] as string[], config: () => [...reportsConfig.recipients] },
  "reports.weeklyEnabled": { schema: z.boolean(), fallback: true, config: () => reportsConfig.weekly.enabled },
  "reports.monthlyEnabled": { schema: z.boolean(), fallback: true, config: () => reportsConfig.monthly.enabled },
  "reports.weeklyDay": { schema: z.number().int().min(0).max(6), fallback: 1, config: () => reportsConfig.weekly.dayOfWeek },
  "reports.monthlyDay": { schema: z.number().int().min(1).max(28), fallback: 1, config: () => reportsConfig.monthly.dayOfMonth },
} as const;

export type SettingKey = keyof typeof settingDefs;
type SettingValue<K extends SettingKey> = z.infer<(typeof settingDefs)[K]["schema"]>;

const TTL_MS = 15_000;
let cache: { at: number; rows: Map<string, unknown> } | null = null;

async function loadRows() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = new Map<string, unknown>((await db.siteSetting.findMany()).map((r) => [r.key, r.value]));
  cache = { at: Date.now(), rows };
  return rows;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const def = settingDefs[key];
  const rows = await loadRows();
  if (rows.has(key)) {
    const parsed = def.schema.safeParse(rows.get(key));
    if (parsed.success) return parsed.data as SettingValue<K>;
  }
  const fromConfig = def.schema.safeParse(def.config());
  return (fromConfig.success ? fromConfig.data : def.fallback) as SettingValue<K>;
}

export async function setSetting<K extends SettingKey>(key: K, value: unknown, adminId: string) {
  const parsed = settingDefs[key].schema.parse(value);
  await db.$transaction([
    db.siteSetting.upsert({
      where: { key },
      create: { key, value: parsed as never, updatedById: adminId },
      update: { value: parsed as never, updatedById: adminId },
    }),
    db.adminAuditLog.create({ data: { adminId, action: "setting.update", entity: "SiteSetting", entityId: key, metadata: { value: parsed as never } } }),
  ]);
  cache = null;
}

/** Remove the override so the config-file default applies again. */
export async function clearSetting(key: SettingKey, adminId: string) {
  await db.$transaction([
    db.siteSetting.deleteMany({ where: { key } }),
    db.adminAuditLog.create({ data: { adminId, action: "setting.clear", entity: "SiteSetting", entityId: key } }),
  ]);
  cache = null;
}

export type SettingState = { value: unknown; overridden: boolean; defaultValue: unknown };

/** Every setting with its effective value, whether it is overridden, and the config default. For the settings screens. */
export async function getAllSettings(): Promise<Record<string, SettingState>> {
  const rows = await loadRows();
  const out: Record<string, SettingState> = {};
  for (const key of Object.keys(settingDefs) as SettingKey[]) {
    const def = settingDefs[key];
    const d = def.schema.safeParse(def.config());
    const defaultValue = d.success ? d.data : def.fallback;
    const o = rows.has(key) ? def.schema.safeParse(rows.get(key)) : null;
    out[key] = { value: o?.success ? o.data : defaultValue, overridden: Boolean(o?.success), defaultValue };
  }
  return out;
}

/** Apply several changes atomically. A null value clears the override. Validates every value before writing any. */
export async function saveSettings(values: Record<string, unknown>, adminId: string) {
  const ops = [];
  for (const [key, raw] of Object.entries(values)) {
    if (!(key in settingDefs)) throw new AppError("UNKNOWN_SETTING", `Unknown setting: ${key}`, 422);
    const def = settingDefs[key as SettingKey];
    if (raw === null) {
      ops.push(db.siteSetting.deleteMany({ where: { key } }));
      ops.push(db.adminAuditLog.create({ data: { adminId, action: "setting.clear", entity: "SiteSetting", entityId: key } }));
      continue;
    }
    const parsed = def.schema.safeParse(raw);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Some settings are invalid.", 422, { [key]: parsed.error.issues[0]?.message ?? "Invalid value" });
    ops.push(db.siteSetting.upsert({ where: { key }, create: { key, value: parsed.data as never, updatedById: adminId }, update: { value: parsed.data as never, updatedById: adminId } }));
    ops.push(db.adminAuditLog.create({ data: { adminId, action: "setting.update", entity: "SiteSetting", entityId: key, metadata: { value: parsed.data as never } } }));
  }
  await db.$transaction(ops);
  cache = null;
}

/** Drop the in-memory cache (used after bulk changes and in tests). */
export function invalidateSettingsCache() { cache = null; }
