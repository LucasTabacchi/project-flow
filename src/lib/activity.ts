import "server-only";

import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ActivityMeta = {
  cardId?: string;
  cardTitle?: string;
  listName?: string;
  fromList?: string;
  toList?: string;
  assigneeName?: string;
  oldValue?: string;
  newValue?: string;
  minutes?: number;
};

type LogActivityInput = {
  boardId: string;
  userId: string;
  type: ActivityType;
  summary: string;
  meta?: ActivityMeta;
};

// Fire-and-forget — nunca bloquea las acciones principales
export function logActivity(input: LogActivityInput): void {
  void prisma.boardActivity
    .create({
      data: {
        boardId: input.boardId,
        userId: input.userId,
        type: input.type,
        summary: input.summary,
        meta: input.meta ?? undefined,
      },
    })
    .catch(() => {
      // Fallo silencioso — la actividad es informativa, no crítica
    });
}

export async function getBoardActivity(boardId: string, limit = 50) {
  return prisma.boardActivity.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      summary: true,
      meta: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
    },
  });
}

// ── Ronda 1: historial filtrado por tarjeta ───────────────────────────────────
export async function getCardActivity(cardId: string, limit = 50) {
  // BoardActivity guarda el cardId en el campo meta JSON.
  // Filtramos con el operador path de Postgres via Prisma JSON filter.
  return prisma.boardActivity.findMany({
    where: {
      meta: {
        path: ["cardId"],
        equals: cardId,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      summary: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
    },
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export type BoardActivityItem = Awaited<ReturnType<typeof getBoardActivity>>[number];
export type CardActivityItem = Awaited<ReturnType<typeof getCardActivity>>[number];
