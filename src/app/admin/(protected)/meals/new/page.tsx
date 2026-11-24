import { PageHeader } from "@/components/admin/ui";
import { MealForm, emptyMeal } from "@/components/forms/meal-form";
import { siteConfig } from "@/config";
import { listAdminCategories } from "@/services/meal-admin.service";

export const metadata = { title: "Add meal" };

export default async function NewMealPage() {
  const categories = await listAdminCategories();
  return (<><PageHeader title="Add meal" subtitle="Normal meals have one price. Special meals are priced by litre." /><MealForm initial={emptyMeal} categories={categories.map((c) => ({ id: c.id, name: c.name }))} siteUrl={siteConfig.appUrl} /></>);
}
