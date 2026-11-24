import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public fields?: Record<string, string>) {
    super(message);
  }
}

export const ok = <T,>(data: T, status = 200) => NextResponse.json({ ok: true, data }, { status });

export function fail(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ ok: false, error: { code: err.code, message: err.message, fields: err.fields } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Some fields are invalid.", fields } }, { status: 422 });
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Try again." } }, { status: 500 });
}
