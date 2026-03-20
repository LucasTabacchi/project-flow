import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getBoardMembership } from "@/lib/data/boards";
import { getBoardActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { boardId } = await params;
  const membership = await getBoardMembership(boardId, user.id);

  if (!membership) {
    return NextResponse.json({ message: "Sin acceso." }, { status: 403 });
  }

  const activity = await getBoardActivity(boardId);

  return NextResponse.json({ activity });
}
