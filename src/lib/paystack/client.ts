const BASE = "https://api.paystack.co";

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) throw new Error(`Paystack error: ${json?.message ?? res.status}`);
  return json.data as T;
}

export type PaystackInit = { authorization_url: string; access_code: string; reference: string };
export type PaystackTransaction = { id: number; status: string; reference: string; amount: number; currency: string; channel?: string; metadata?: unknown };

export const initializeTransaction = (body: { email: string; amount: number; currency: string; reference: string; callback_url: string; metadata: Record<string, unknown> }) =>
  call<PaystackInit>("/transaction/initialize", { method: "POST", body: JSON.stringify(body) });

export const verifyTransaction = (reference: string) =>
  call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
