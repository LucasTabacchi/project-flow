import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/session";
import { getSearchContext } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      {
        message: "Necesitás iniciar sesión.",
      },
      {
        status: 401,
      },
    );
  }

  const context = await getSearchContext(userId);

  return NextResponse.json(context, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
    },
  });
}
