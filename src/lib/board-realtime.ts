import "server-only";

import { prisma } from "@/lib/db";
import { BOARD_PRESENCE_TTL_MS } from "@/lib/realtime-constants";
import {
  isRedisConfigured,
  redisIncrBoardRevision,
  redisSetBoardEvent,
} from "@/lib/redis";
import type { BoardPresenceView } from "@/types";

export type BoardRealtimeEvent =
  | { type: "board-updated"; updatedAt: string }
  | { type: "presence-updated"; presence: BoardPresenceView[] }
  | { type: "board-removed" };

type BoardRealtimeListener = (event: BoardRealtimeEvent) => void;

// ─── Bus en memoria (fallback cuando Redis no está configurado) ───────────────

declare global {
  var __projectflowBoardRealtimeListeners:
    | Map<string, Set<BoardRealtimeListener>>
    | undefined;
}

function getBoardRealtimeListeners() {
  if (!globalThis.__projectflowBoardRealtimeListeners) {
    globalThis.__projectflowBoardRealtimeListeners = new Map();
  }
  return globalThis.__projectflowBoardRealtimeListeners;
}

function notifyLocalListeners(boardId: string, event: BoardRealtimeEvent) {
  const listeners = getBoardRealtimeListeners().get(boardId);
  if (!listeners?.size) return;

  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // Listener individual falla — no corta el resto
    }
  }
}

// ─── Publicación de eventos ───────────────────────────────────────────────────
// Con Redis: guarda el evento + incrementa el revision counter.
//            El SSE route detecta el cambio en el poll de Redis (cada 2s).
// Sin Redis: notifica directamente los listeners en memoria (misma instancia).

async function publishBoardEvent(boardId: string, event: BoardRealtimeEvent) {
  // Siempre notificar listeners locales (misma instancia, respuesta inmediata)
  notifyLocalListeners(boardId, event);

  // Si Redis está configurado, persistir el evento para otras instancias
  if (isRedisConfigured()) {
    await Promise.all([
      redisSetBoardEvent(boardId, JSON.stringify(event)),
      redisIncrBoardRevision(boardId),
    ]).catch(() => {
      // Redis falla silenciosamente — el fallback poll de 30s cubre el gap
    });
  }
}

// ─── Suscripción ─────────────────────────────────────────────────────────────

export function subscribeToBoardRealtime(
  boardId: string,
  listener: BoardRealtimeListener,
) {
  const listenersByBoard = getBoardRealtimeListeners();
  const listeners =
    listenersByBoard.get(boardId) ?? new Set<BoardRealtimeListener>();

  listeners.add(listener);
  listenersByBoard.set(boardId, listeners);

  return () => {
    const current = listenersByBoard.get(boardId);
    if (!current) return;
    current.delete(listener);
    if (!current.size) listenersByBoard.delete(boardId);
  };
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function getPresenceCutoffDate() {
  return new Date(Date.now() - BOARD_PRESENCE_TTL_MS);
}

export async function getBoardSyncState(boardId: string) {
  return prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, updatedAt: true },
  });
}

export async function touchBoard(boardId: string) {
  const board = await prisma.board.update({
    where: { id: boardId },
    data: { updatedAt: new Date() },
    select: { updatedAt: true },
  });

  await publishBoardEvent(boardId, {
    type: "board-updated",
    updatedAt: board.updatedAt.toISOString(),
  });

  return board.updatedAt;
}

export async function touchCard(cardId: string) {
  const card = await prisma.card.update({
    where: { id: cardId },
    data: { updatedAt: new Date() },
    select: { updatedAt: true },
  });
  return card.updatedAt;
}

export async function pruneBoardPresence(boardId: string) {
  await prisma.boardPresence.deleteMany({
    where: {
      boardId,
      lastSeenAt: { lt: getPresenceCutoffDate() },
    },
  });
}

export async function upsertBoardPresence(input: {
  boardId: string;
  userId: string;
  clientId: string;
  activeCardId: string | null;
  activeField: string | null;
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
      activeField: input.activeField,
      lastSeenAt: now,
    },
    update: {
      activeCardId: input.activeCardId,
      activeField: input.activeField,
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
      lastSeenAt: { gte: getPresenceCutoffDate() },
    },
    orderBy: { lastSeenAt: "desc" },
    select: {
      userId: true,
      activeCardId: true,
      activeField: true,
      lastSeenAt: true,
      user: {
        select: { name: true, email: true, avatarUrl: true },
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
        activeField: row.activeField,
        sessionCount: 1,
        lastSeenAt: row.lastSeenAt,
      });
      continue;
    }

    current.sessionCount += 1;
    if (!current.activeCardId && row.activeCardId) current.activeCardId = row.activeCardId;
    if (!current.activeField && row.activeField) current.activeField = row.activeField;
    if (row.lastSeenAt > current.lastSeenAt) current.lastSeenAt = row.lastSeenAt;
  }

  return [...aggregated.values()]
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    .map((e) => ({
      userId: e.userId,
      name: e.name,
      email: e.email,
      avatarUrl: e.avatarUrl,
      activeCardId: e.activeCardId,
      activeField: e.activeField,
      sessionCount: e.sessionCount,
    }));
}

export async function publishBoardPresence(
  boardId: string,
  presence: BoardPresenceView[],
) {
  await publishBoardEvent(boardId, { type: "presence-updated", presence });
}

export async function publishBoardRemoved(boardId: string) {
  await publishBoardEvent(boardId, { type: "board-removed" });
}

export function createPresenceFingerprint(presence: BoardPresenceView[]) {
  return JSON.stringify(
    presence
      .map((e) => ({
        userId: e.userId,
        activeCardId: e.activeCardId,
        sessionCount: e.sessionCount,
      }))
      .sort((a, b) => a.userId.localeCompare(b.userId)),
  );
}
