import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getSearchContext } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Necesitás iniciar sesión.",
      },
      {
        status: 401,
      },
    );
  }

  const context = await getSearchContext(user.id);

  return NextResponse.json(context, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
