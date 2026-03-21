import { NextRequest, NextResponse } from "next/server";

import {
  enqueueBoardReminderNotificationJobs,
  processPendingBoardEmailNotificationJobs,
} from "@/lib/board-email-notifications";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    const host = request.headers.get("host") ?? "";
    if (!host.startsWith("localhost") && !host.startsWith("127.")) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reminderSummary = await enqueueBoardReminderNotificationJobs();
    const summary = await processPendingBoardEmailNotificationJobs(25);

    return NextResponse.json({
      ok: true,
      reminders: reminderSummary,
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
