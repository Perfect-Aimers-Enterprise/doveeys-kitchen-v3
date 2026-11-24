import Link from "next/link";
import { AuthShell } from "@/components/admin/auth-shell";
import { AuthForm } from "@/components/forms/auth-form";
import { registrationOpen } from "@/services/auth.service";

export const metadata = { title: "Create administrator account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!(await registrationOpen())) {
    return (
      <AuthShell title="Registration is closed" intro="Both administrator accounts have been created. Sign in with an existing account.">
        <Link href="/admin/login" className="text-sm underline underline-offset-4">Go to sign in</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Create administrator account" intro="You need the private setup key from the deployment environment.">
      <AuthForm endpoint="/api/admin/auth/register" submitLabel="Create account" redirectTo="/admin/dashboard"
        fields={[
          { name: "name", label: "Full name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "username" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 12 characters, with upper and lower case letters and a number." },
          { name: "setupKey", label: "Setup key", type: "password", autoComplete: "off" },
        ]} />
    </AuthShell>
  );
}
