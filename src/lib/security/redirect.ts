/** Only allow same-site admin paths after login, blocking open redirects. */
export function safeNext(value: string | null | undefined, fallback = "/admin/dashboard") {
  if (!value || !value.startsWith("/admin/") || value.startsWith("//") || value.includes("\\") || value.includes("..") || /[\r\n]/.test(value)) return fallback;
  if (/^\/admin\/(login|register|forgot-password|reset-password)(\/|\?|$)/.test(value)) return fallback;
  return value;
}
