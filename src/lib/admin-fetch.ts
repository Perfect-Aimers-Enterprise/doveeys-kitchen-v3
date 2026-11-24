export class ApiError extends Error {
  constructor(public code: string, message: string, public fields: Record<string, string> = {}, public status = 0) { super(message); }
}

/** Browser helper for /api/admin/* routes. Throws ApiError with field-level messages when the server rejects input. */
export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
      ...(opts.form ? { body: opts.form } : opts.body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(opts.body) } : {}),
    });
  } catch { throw new ApiError("NETWORK", "Could not reach the server. Check your connection and try again."); }
  const json = await res.json().catch(() => null);
  if (res.status === 401) { window.location.href = `/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`; throw new ApiError("UNAUTHENTICATED", "Your session has expired.", {}, 401); }
  if (!json?.ok) throw new ApiError(json?.error?.code ?? "ERROR", json?.error?.message ?? "Something went wrong.", json?.error?.fields ?? {}, res.status);
  return json.data as T;
}
