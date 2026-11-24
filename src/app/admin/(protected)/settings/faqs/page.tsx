import { PageHeader } from "@/components/admin/ui";
import { FaqManager } from "@/components/forms/faq-manager";
import { db } from "@/lib/db";

export const metadata = { title: "FAQs" };

export default async function Page() {
  const items = await db.faq.findMany({ orderBy: { sortOrder: "asc" }, select: { question: true, answer: true } });
  return (<><PageHeader title="FAQs" subtitle="Add, edit, reorder or remove questions. Any number is fine." /><FaqManager initial={items} /></>);
}
