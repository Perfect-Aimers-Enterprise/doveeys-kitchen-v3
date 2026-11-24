import Link from "next/link";
import { AuthShell } from "@/components/admin/auth-shell";
import { AuthForm } from "@/components/forms/auth-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter your administrator email and we will send a reset link.">
      <AuthForm endpoint="/api/admin/auth/forgot" submitLabel="Send reset link" 
        successMessage="If that email belongs to an administrator, a reset link is on its way. It expires in 60 minutes."
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "username" }]} />
      <p className="mt-6 text-sm text-text-2"><Link href="/admin/login" className="underline-offset-4 hover:underline">Back to sign in</Link></p>
    </AuthShell>
  );
}
