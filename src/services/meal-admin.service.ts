import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { deleteImage } from "@/lib/cloudinary";
import { RESERVED_SLUGS, slugify, type MealInput } from "@/lib/validation/meal";
import { toMoneyString } from "@/utils/money";

async function uniqueSlug(base: string, table: "meal" | "mealCategory", excludeId?: string) {
  let root = slugify(base) || "item";
  if (table === "meal" && RESERVED_SLUGS.includes(root)) root = `${root}-meal`;
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? root : `${root}-${n + 1}`;
    const clash = table === "meal" ? await db.meal.findUnique({ where: { slug } }) : await db.mealCategory.findUnique({ where: { slug } });
    if (!clash || clash.id === excludeId) return slug;
  }
  throw new AppError("SLUG_UNAVAILABLE", "Could not create a unique web address. Change the name.", 409);
}

async function assertCategory(id: string | null | undefined) {
  if (id && !(await db.mealCategory.findFirst({ where: { id, archivedAt: null } }))) throw new AppError("INVALID_CATEGORY", "That category does not exist.", 422, { categoryId: "Choose an existing category" });
}

const optionRows = (m: MealInput) => m.options.map((o, i) => ({ litres: Number(o.litres).toFixed(2), price: Number(o.price).toFixed(2), sortOrder: i }));

export async function listAdminMeals(f: { q?: string; status?: "active" | "archived" | "all"; type?: "NORMAL" | "SPECIAL"; categoryId?: string }) {
  return db.meal.findMany({
    where: {
      ...(f.status === "archived" ? { archivedAt: { not: null } } : f.status === "all" ? {} : { archivedAt: null }),
      ...(f.type ? { type: f.type } : {}), ...(f.categoryId ? { categoryId: f.categoryId } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { slug: { contains: f.q, mode: "insensitive" } }] } : {}),
    },
    include: { category: true, options: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export const getAdminMeal = (id: string) => db.meal.findUnique({ where: { id }, include: { category: true, options: { orderBy: { sortOrder: "asc" } } } });

export async function createMeal(input: MealInput, adminId: string) {
  await assertCategory(input.categoryId);
  const slug = await uniqueSlug(input.slug || input.name, "meal");
  const max = await db.meal.aggregate({ _max: { sortOrder: true } });
  try {
    return await db.$transaction(async (t) => {
      const meal = await t.meal.create({
        data: {
          slug, name: input.name, description: input.description, ingredients: input.ingredients || null, type: input.type,
          basePrice: input.type === "NORMAL" ? Number(input.basePrice).toFixed(2) : null, categoryId: input.categoryId || null,
          isAvailable: input.isAvailable, isFeatured: input.isFeatured, imageUrl: input.imageUrl || null, imagePublicId: input.imagePublicId || null,
          sortOrder: (max._max.sortOrder ?? -1) + 1, options: input.type === "SPECIAL" ? { create: optionRows(input) } : undefined,
        },
      });
      await t.adminAuditLog.create({ data: { adminId, action: "meal.create", entity: "Meal", entityId: meal.id, metadata: { name: meal.name } } });
      return meal;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError("SLUG_TAKEN", "A meal with this web address already exists.", 409, { slug: "Already in use" });
    throw e;
  }
}

export async function updateMeal(id: string, input: MealInput, adminId: string) {
  const existing = await db.meal.findUnique({ where: { id }, include: { options: true } });
  if (!existing) throw new AppError("MEAL_NOT_FOUND", "Meal not found.", 404);
  await assertCategory(input.categoryId);
  const slug = input.slug ? input.slug : existing.slug;
  if (slug !== existing.slug && (await db.meal.findUnique({ where: { slug } }))) throw new AppError("SLUG_TAKEN", "A meal with this web address already exists.", 409, { slug: "Already in use" });
  const keepIds = new Set(input.options.map((o) => o.id).filter(Boolean) as string[]);

  await db.$transaction(async (t) => {
    await t.meal.update({
      where: { id },
      data: {
        slug, name: input.name, description: input.description, ingredients: input.ingredients || null, type: input.type,
        basePrice: input.type === "NORMAL" ? Number(input.basePrice).toFixed(2) : null, categoryId: input.categoryId || null,
        isAvailable: input.isAvailable, isFeatured: input.isFeatured, imageUrl: input.imageUrl || null, imagePublicId: input.imagePublicId || null,
      },
    });
    if (input.type === "NORMAL") {
      await t.specialMealOption.deleteMany({ where: { mealId: id } });
    } else {
      // Past orders keep their own snapshot, so removing an option never changes order history.
      await t.specialMealOption.deleteMany({ where: { mealId: id, id: { notIn: [...keepIds] } } });
      for (const [i, o] of input.options.entries()) {
        const data = { litres: Number(o.litres).toFixed(2), price: Number(o.price).toFixed(2), sortOrder: i };
        if (o.id && existing.options.some((x) => x.id === o.id)) await t.specialMealOption.update({ where: { id: o.id }, data });
        else await t.specialMealOption.create({ data: { ...data, mealId: id } });
      }
    }
    await t.adminAuditLog.create({ data: { adminId, action: "meal.update", entity: "Meal", entityId: id, metadata: { name: input.name, price: input.basePrice ?? null } } });
  });
  if (existing.imagePublicId && existing.imagePublicId !== (input.imagePublicId || null)) await deleteImage(existing.imagePublicId);
}

export async function patchMeal(id: string, patch: { isAvailable?: boolean; isFeatured?: boolean }, adminId: string) {
  const res = await db.meal.updateMany({ where: { id }, data: patch });
  if (!res.count) throw new AppError("MEAL_NOT_FOUND", "Meal not found.", 404);
  await db.adminAuditLog.create({ data: { adminId, action: "meal.patch", entity: "Meal", entityId: id, metadata: patch } });
}

/** Meals are archived, never hard-deleted, so old orders and reports stay intact. Archived meals vanish from the storefront. */
export async function setMealArchived(id: string, archived: boolean, adminId: string) {
  const res = await db.meal.updateMany({ where: { id }, data: { archivedAt: archived ? new Date() : null, ...(archived ? { isFeatured: false } : {}) } });
  if (!res.count) throw new AppError("MEAL_NOT_FOUND", "Meal not found.", 404);
  await db.adminAuditLog.create({ data: { adminId, action: archived ? "meal.archive" : "meal.restore", entity: "Meal", entityId: id } });
}

export async function reorder(table: "meal" | "mealCategory", ids: string[], adminId: string) {
  await db.$transaction([
    ...ids.map((id, i) => (table === "meal" ? db.meal.update({ where: { id }, data: { sortOrder: i } }) : db.mealCategory.update({ where: { id }, data: { sortOrder: i } }))),
    db.adminAuditLog.create({ data: { adminId, action: `${table}.reorder`, entity: table === "meal" ? "Meal" : "MealCategory" } }),
  ]);
}

/* ---- categories ---- */
export const listAdminCategories = () => db.mealCategory.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { meals: { where: { archivedAt: null } } } } } });

export async function createCategory(name: string, adminId: string) {
  const max = await db.mealCategory.aggregate({ _max: { sortOrder: true } });
  const c = await db.mealCategory.create({ data: { name, slug: await uniqueSlug(name, "mealCategory"), sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  await db.adminAuditLog.create({ data: { adminId, action: "category.create", entity: "MealCategory", entityId: c.id } });
  return c;
}
export async function renameCategory(id: string, name: string, adminId: string) {
  const c = await db.mealCategory.update({ where: { id }, data: { name, slug: await uniqueSlug(name, "mealCategory", id) } }).catch(() => null);
  if (!c) throw new AppError("CATEGORY_NOT_FOUND", "Category not found.", 404);
  await db.adminAuditLog.create({ data: { adminId, action: "category.update", entity: "MealCategory", entityId: id } });
  return c;
}
export async function archiveCategory(id: string, adminId: string) {
  await db.$transaction([
    db.meal.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
    db.mealCategory.update({ where: { id }, data: { archivedAt: new Date() } }),
    db.adminAuditLog.create({ data: { adminId, action: "category.archive", entity: "MealCategory", entityId: id } }),
  ]);
}

/* ---- delivery zones and FAQs ---- */
export const listZones = () => db.deliveryZone.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

export async function saveZone(id: string | null, v: { name: string; fee: string; isActive: boolean }, adminId: string) {
  const data = { name: v.name, fee: Number(v.fee).toFixed(2), isActive: v.isActive };
  try {
    const z = id ? await db.deliveryZone.update({ where: { id }, data }) : await db.deliveryZone.create({ data });
    await db.adminAuditLog.create({ data: { adminId, action: id ? "zone.update" : "zone.create", entity: "DeliveryZone", entityId: z.id, metadata: { fee: toMoneyString(v.fee) } } });
    return z;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError("ZONE_EXISTS", "A delivery area with this name already exists.", 409, { name: "Already exists" });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new AppError("ZONE_NOT_FOUND", "Delivery area not found.", 404);
    throw e;
  }
}
export async function deleteZone(id: string, adminId: string) {
  await db.deliveryZone.delete({ where: { id } }).catch(() => { throw new AppError("ZONE_NOT_FOUND", "Delivery area not found.", 404); });
  await db.adminAuditLog.create({ data: { adminId, action: "zone.delete", entity: "DeliveryZone", entityId: id } });
}

export async function replaceFaqs(items: { question: string; answer: string }[], adminId: string) {
  await db.$transaction([
    db.faq.deleteMany(), db.faq.createMany({ data: items.map((f, i) => ({ ...f, sortOrder: i })) }),
    db.adminAuditLog.create({ data: { adminId, action: "faq.replace", entity: "Faq", metadata: { count: items.length } } }),
  ]);
}
