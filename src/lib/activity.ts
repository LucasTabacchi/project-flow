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

export type BoardActivityItem = Awaited<ReturnType<typeof getBoardActivity>>[number];
