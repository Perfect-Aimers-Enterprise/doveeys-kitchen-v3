import Link from "next/link";
import { AuthShell } from "@/components/admin/auth-shell";
import { AuthForm } from "@/components/forms/auth-form";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  if (!token) {
    return (
      <AuthShell title="Reset link missing" intro="Open the link from your email, or request a new one.">
        <Link href="/admin/forgot-password" className="text-sm underline underline-offset-4">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password">
      <AuthForm endpoint="/api/admin/auth/reset" submitLabel="Save password" extra={{ token }} redirectTo="/admin/login"
        fields={[{ name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 12 characters, with upper and lower case letters and a number." }]} />
    </AuthShell>
  );
}
