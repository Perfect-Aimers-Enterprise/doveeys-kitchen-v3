import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { MealForm } from "@/components/forms/meal-form";
import { siteConfig } from "@/config";
import { getAdminMeal, listAdminCategories } from "@/services/meal-admin.service";
import { toMoneyString } from "@/utils/money";

export const metadata = { title: "Edit meal" };

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const [meal, categories] = await Promise.all([getAdminMeal((await params).id), listAdminCategories()]);
  if (!meal) notFound();
  return (
    <>
      <PageHeader title={meal.name} subtitle={meal.archivedAt ? "This meal is archived and hidden from the menu." : "Price changes only affect new orders. Existing orders keep the price they were placed at."} />
      <MealForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} siteUrl={siteConfig.appUrl}
        initial={{ id: meal.id, name: meal.name, slug: meal.slug, description: meal.description, ingredients: meal.ingredients ?? "", type: meal.type, basePrice: meal.basePrice ? toMoneyString(meal.basePrice) : "", categoryId: meal.categoryId ?? "", isAvailable: meal.isAvailable, isFeatured: meal.isFeatured, imageUrl: meal.imageUrl ?? "", imagePublicId: meal.imagePublicId ?? "", options: meal.options.map((o) => ({ id: o.id, litres: o.litres.toString(), price: toMoneyString(o.price) })) }} />
    </>
  );
}
