import { AppError, fail, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { getTrackingView } from "@/services/tracking.service";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await enforceRateLimit(`track:${clientIp(req)}`, 60, 10 * 60 * 1000);
    const token = (await params).token;
    const view = /^[A-Za-z0-9_-]{30,100}$/.test(token) ? await getTrackingView(token) : null;
    if (!view) throw new AppError("TRACKING_NOT_FOUND", "We could not find an order for this link.", 404);
    return ok({ order: view });
  } catch (e) { return fail(e); }
}
