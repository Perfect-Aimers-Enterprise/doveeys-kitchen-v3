import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Production seeds nothing: no invented business data. Sample rows only when explicitly requested.
async function main() {
  if (process.env.SEED_SAMPLE_DATA !== "true") {
    console.log("Nothing to seed. Set SEED_SAMPLE_DATA=true for development sample data.");
    return;
  }
  const cat = await db.mealCategory.upsert({
    where: { slug: "sample-category" },
    create: { name: "Sample category", slug: "sample-category" },
    update: {},
  });
  await db.meal.upsert({
    where: { slug: "sample-meal" },
    create: { slug: "sample-meal", name: "Sample meal", description: "Development sample only.", type: "NORMAL", basePrice: "5000.00", categoryId: cat.id },
    update: {},
  });
  const special = await db.meal.upsert({
    where: { slug: "sample-special" },
    create: { slug: "sample-special", name: "Sample special", description: "Development sample only.", type: "SPECIAL", categoryId: cat.id },
    update: {},
  });
  for (const [litres, price, sortOrder] of [["1", "12000.00", 0], ["2", "23000.00", 1], ["3", "34000.00", 2]] as const) {
    await db.specialMealOption.upsert({
      where: { mealId_litres: { mealId: special.id, litres } },
      create: { mealId: special.id, litres, price, sortOrder },
      update: { price },
    });
  }
}

main().finally(() => db.$disconnect());
