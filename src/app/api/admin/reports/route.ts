import { ok } from "@/lib/api";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/admin-route";

export const runtime = "nodejs";

export const GET = adminRoute(async () => ok({ reports: await db.reportLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }) }));
