import "server-only";

import { prisma } from "@/lib/db";

export type NotificationPayload =
  | {
      type: "CARD_ASSIGNED";
      userId: string;
      actorName: string;
      cardTitle: string;
      boardId: string;
      cardId?: string;
    }
  | {
      type: "CARD_COMMENT";
      userId: string;
      actorName: string;
      cardTitle: string;
      boardId: string;
    }
  | {
      type: "CARD_MENTION";
      userId: string;
      actorName: string;
      cardTitle: string;
      boardId: string;
    }
  | {
      type: "BOARD_INVITATION";
      userId: string;
      actorName: string;
      boardName: string;
      token: string;
    }
  | {
      type: "INVITATION_ACCEPTED";
      userId: string;
      actorName: string;
      boardName: string;
      boardId: string;
    }
  | {
      type: "INVITATION_DECLINED";
      userId: string;
      actorName: string;
      boardName: string;
      boardId: string;
    };

function buildNotification(payload: NotificationPayload): {
  userId: string;
  type: NotificationPayload["type"];
  title: string;
  body: string;
  href: string | null;
} {
  switch (payload.type) {
    case "CARD_ASSIGNED":
      return {
        userId: payload.userId,
        type: "CARD_ASSIGNED",
        title: "Te asignaron a una tarjeta",
        body: `${payload.actorName} te asignó a "${payload.cardTitle}"`,
        href: `/boards/${payload.boardId}`,
      };
    case "CARD_COMMENT":
      return {
        userId: payload.userId,
        type: "CARD_COMMENT",
        title: "Nuevo comentario",
        body: `${payload.actorName} comentó en "${payload.cardTitle}"`,
        href: `/boards/${payload.boardId}`,
      };
    case "CARD_MENTION":
      return {
        userId: payload.userId,
        type: "CARD_MENTION",
        title: "Te mencionaron en un comentario",
        body: `${payload.actorName} te mencionó en "${payload.cardTitle}"`,
        href: `/boards/${payload.boardId}`,
      };
    case "BOARD_INVITATION":
      return {
        userId: payload.userId,
        type: "BOARD_INVITATION",
        title: "Invitación a tablero",
        body: `${payload.actorName} te invitó a colaborar en un tablero`,
        href: `/invite/${payload.token}`,
      };
    case "INVITATION_ACCEPTED":
      return {
        userId: payload.userId,
        type: "INVITATION_ACCEPTED",
        title: "Invitación aceptada",
        body: `${payload.actorName} aceptó unirse a "${payload.boardName}"`,
        href: `/boards/${payload.boardId}`,
      };
    case "INVITATION_DECLINED":
      return {
        userId: payload.userId,
        type: "INVITATION_DECLINED",
        title: "Invitación rechazada",
        body: `${payload.actorName} declinó unirse a "${payload.boardName}"`,
        href: `/boards/${payload.boardId}`,
      };
  }
}

// Fire-and-forget — no bloqueamos las acciones principales por notificaciones
export function createNotification(payload: NotificationPayload): void {
  const data = buildNotification(payload);
  void prisma.notification.create({ data }).catch(() => {
    // Silently ignore notification failures
  });
}

export function createNotifications(payloads: NotificationPayload[]): void {
  if (!payloads.length) return;
  const data = payloads.map(buildNotification);
  void prisma.notification.createMany({ data }).catch(() => {
    // Silently ignore notification failures
  });
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  return prisma.notification.updateMany({
    where: {
      userId,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
