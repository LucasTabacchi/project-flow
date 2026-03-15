import "server-only";

import { prisma } from "@/lib/db";
import { BOARD_PRESENCE_TTL_MS } from "@/lib/realtime-constants";
import type { BoardPresenceView } from "@/types";

function getPresenceCutoffDate() {
  return new Date(Date.now() - BOARD_PRESENCE_TTL_MS);
}

export async function getBoardSyncState(boardId: string) {
  return prisma.board.findUnique({
    where: {
      id: boardId,
    },
    select: {
      id: true,
      updatedAt: true,
    },
  });
}

export async function touchBoard(boardId: string) {
  const board = await prisma.board.update({
    where: {
      id: boardId,
    },
    data: {
      updatedAt: new Date(),
    },
    select: {
      updatedAt: true,
    },
  });

  return board.updatedAt;
}

export async function touchCard(cardId: string) {
  const card = await prisma.card.update({
    where: {
      id: cardId,
    },
    data: {
      updatedAt: new Date(),
    },
    select: {
      updatedAt: true,
    },
  });

  return card.updatedAt;
}

export async function pruneBoardPresence(boardId: string) {
  await prisma.boardPresence.deleteMany({
    where: {
      boardId,
      lastSeenAt: {
        lt: getPresenceCutoffDate(),
      },
    },
  });
}

export async function upsertBoardPresence(input: {
  boardId: string;
  userId: string;
  clientId: string;
  activeCardId: string | null;
}) {
  const now = new Date();

  await prisma.boardPresence.upsert({
    where: {
      boardId_userId_clientId: {
        boardId: input.boardId,
        userId: input.userId,
        clientId: input.clientId,
      },
    },
    create: {
      boardId: input.boardId,
      userId: input.userId,
      clientId: input.clientId,
      activeCardId: input.activeCardId,
      lastSeenAt: now,
    },
    update: {
      activeCardId: input.activeCardId,
      lastSeenAt: now,
    },
  });
}

export async function removeBoardPresence(input: {
  boardId: string;
  userId: string;
  clientId: string;
}) {
  await prisma.boardPresence.deleteMany({
    where: {
      boardId: input.boardId,
      userId: input.userId,
      clientId: input.clientId,
    },
  });
}

export async function getBoardPresence(boardId: string): Promise<BoardPresenceView[]> {
  const rows = await prisma.boardPresence.findMany({
    where: {
      boardId,
      lastSeenAt: {
        gte: getPresenceCutoffDate(),
      },
    },
    orderBy: {
      lastSeenAt: "desc",
    },
    select: {
      userId: true,
      activeCardId: true,
      lastSeenAt: true,
      user: {
        select: {
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  const aggregated = new Map<string, BoardPresenceView & { lastSeenAt: Date }>();

  for (const row of rows) {
    const current = aggregated.get(row.userId);

    if (!current) {
      aggregated.set(row.userId, {
        userId: row.userId,
        name: row.user.name,
        email: row.user.email,
        avatarUrl: row.user.avatarUrl,
        activeCardId: row.activeCardId,
        sessionCount: 1,
        lastSeenAt: row.lastSeenAt,
      });
      continue;
    }

    current.sessionCount += 1;

    if (!current.activeCardId && row.activeCardId) {
      current.activeCardId = row.activeCardId;
    }

    if (row.lastSeenAt > current.lastSeenAt) {
      current.lastSeenAt = row.lastSeenAt;
    }
  }

  return [...aggregated.values()]
    .sort((left, right) => right.lastSeenAt.getTime() - left.lastSeenAt.getTime())
    .map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      email: entry.email,
      avatarUrl: entry.avatarUrl,
      activeCardId: entry.activeCardId,
      sessionCount: entry.sessionCount,
    }));
}

export function createPresenceFingerprint(presence: BoardPresenceView[]) {
  return JSON.stringify(
    presence
      .map((entry) => ({
        userId: entry.userId,
        activeCardId: entry.activeCardId,
        sessionCount: entry.sessionCount,
      }))
      .sort((left, right) => left.userId.localeCompare(right.userId)),
  );
}
