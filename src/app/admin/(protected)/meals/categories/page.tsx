import Link from "next/link";
import { PageHeader, btnGhost } from "@/components/admin/ui";
import { CategoryManager } from "@/components/forms/category-manager";
import { listAdminCategories } from "@/services/meal-admin.service";

export const metadata = { title: "Meal categories" };

export default async function CategoriesPage() {
  const cats = await listAdminCategories();
  return (<><PageHeader title="Categories" subtitle="Group meals on the menu. Each category gets its own page." actions={<Link href="/admin/meals" className={btnGhost}>Back to meals</Link>} /><CategoryManager initial={cats.map((c) => ({ id: c.id, name: c.name, meals: c._count.meals }))} /></>);
}
