import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/auth-shell";
import { AuthForm } from "@/components/forms/auth-form";
import { getCurrentAdmin } from "@/lib/auth/session";
import { safeNext } from "@/lib/security/redirect";
import { registrationOpen } from "@/services/auth.service";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentAdmin()) redirect(next);
  const canRegister = await registrationOpen();
  return (
    <AuthShell title="Sign in" intro="Administrator access only.">
      <AuthForm endpoint="/api/admin/auth/login" submitLabel="Sign in" extra={{ next }}
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "username" }, { name: "password", label: "Password", type: "password", autoComplete: "current-password" }]}
        useResponseNext redirectTo={next} />
      <div className="mt-6 flex justify-between text-sm text-text-2">
        <Link href="/admin/forgot-password" className="underline-offset-4 hover:underline">Forgot password?</Link>
        {canRegister && <Link href="/admin/register" className="underline-offset-4 hover:underline">Create administrator account</Link>}
      </div>
    </AuthShell>
  );
}
