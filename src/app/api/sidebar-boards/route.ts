import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getUserSidebarBoards } from "@/lib/data/boards";

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

  const boards = await getUserSidebarBoards(user.id);

  return NextResponse.json(
    {
      boards,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
