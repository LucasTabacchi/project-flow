import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import {
  createBoardCsv,
  createBoardPdf,
  getBoardExportFilename,
  type BoardExportFormat,
} from "@/lib/board-export";
import { getCurrentUser } from "@/lib/auth/session";
import { getBoardPageData } from "@/lib/data/boards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    boardId: string;
  }>;
};

function isExportFormat(value: string | null): value is BoardExportFormat {
  return value === "csv" || value === "pdf";
}

export async function GET(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Necesitás iniciar sesión." }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format");
  if (!isExportFormat(format)) {
    return NextResponse.json(
      { message: "Formato inválido. Usá ?format=csv o ?format=pdf." },
      { status: 400 },
    );
  }

  const { boardId } = await params;
  const board = await getBoardPageData(boardId, user.id);

  if (!board) {
    return NextResponse.json(
      { message: "No tenés acceso a este tablero." },
      { status: 404 },
    );
  }

  const filename = getBoardExportFilename(board.name, format);

  if (format === "csv") {
    return new Response(`\uFEFF${createBoardCsv(board)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const pdf = await createBoardPdf(board);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
