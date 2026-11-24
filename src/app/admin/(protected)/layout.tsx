import { headers } from "next/headers";
import { AdminShell } from "@/components/admin/shell";
import { requireAdminPage } from "@/lib/auth/session";
import { getSetting } from "@/services/settings.service";

export const dynamic = "force-dynamic";

// Every page in this group needs a valid server-side session. Logged-out visitors are sent to login and returned here afterwards.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const returnTo = (await headers()).get("x-pathname") || "/admin/dashboard";
  const admin = await requireAdminPage(returnTo);
  const brand = await getSetting("brand.name").catch(() => "DOVEEYS KITCHEN");
  return <AdminShell brand={brand} adminName={admin.name}>{children}</AdminShell>;
}
