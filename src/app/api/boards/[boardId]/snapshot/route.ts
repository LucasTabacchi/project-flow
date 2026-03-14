import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getBoardPageData } from "@/lib/data/boards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    boardId: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
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

  const { boardId } = await params;
  const board = await getBoardPageData(boardId, user.id);

  if (!board) {
    return NextResponse.json(
      {
        message: "No tenés acceso a este tablero.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json(board, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
