import { NextRequest, NextResponse } from "next/server";
import { spawnDueRecurringCards } from "@/app/actions/recurring";

/**
 * GET /api/cron/recurring-cards
 *
 * Intended to be called by Vercel Cron or any external scheduler (e.g. cron-job.org).
 * Protected by a shared secret in the Authorization header.
 *
 * Vercel cron.json example:
 * {
 *   "crons": [{
 *     "path": "/api/cron/recurring-cards",
 *     "schedule": "0 6 * * *"   // daily at 06:00 UTC
 *   }]
 * }
 *
 * Required env var: CRON_SECRET — set the same value in Vercel and your cron provider.
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // In dev without CRON_SECRET configured, allow localhost calls only
    const host = request.headers.get("host") ?? "";
    if (!host.startsWith("localhost") && !host.startsWith("127.")) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { spawned, errors } = await spawnDueRecurringCards();

    return NextResponse.json({
      ok: true,
      spawned,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
