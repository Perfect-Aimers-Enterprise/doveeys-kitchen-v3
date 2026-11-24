import { z } from "zod";
import { AppError, ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { emailSchema } from "@/lib/validation/common";
import { readJson } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { layout } from "@/lib/email/templates";
import { sendEmail } from "@/services/email.service";

export const runtime = "nodejs";

export const POST = adminRoute(async ({ req, admin }) => {
  await enforceRateLimit(`email-test:${admin.id}`, 10, 60 * 60 * 1000);
  const { to } = z.object({ to: emailSchema }).strict().parse(await readJson(req));
  const r = await sendEmail({ to, template: "test-email", subject: "Test email from your DOVEEYS KITCHEN dashboard", html: layout("Email is working", "<p>This is a test message. If you can read it, your SMTP settings are correct.</p>"), text: "This is a test message. If you can read it, your SMTP settings are correct." });
  if (!r.ok) throw new AppError("EMAIL_FAILED", `The test email could not be sent: ${r.error}`, 502);
  return ok({ sent: true });
});
