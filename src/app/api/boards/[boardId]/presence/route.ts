import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getBoardPresence,
  publishBoardPresence,
  pruneBoardPresence,
  removeBoardPresence,
  upsertBoardPresence,
} from "@/lib/board-realtime";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const presencePayloadSchema = z.object({
  clientId: z.string().trim().min(1).max(120),
  activeCardId: z.string().trim().min(1).max(120).nullable().optional(),
});

type RouteContext = {
  params: Promise<{
    boardId: string;
  }>;
};

async function requirePresenceAccess(boardId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: new Response("Necesitás iniciar sesión.", {
        status: 401,
      }),
    };
  }

  const membership = await getBoardMembership(boardId, user.id);

  if (!membership) {
    return {
      user: null,
      response: new Response("No tenés acceso a este tablero.", {
        status: 403,
      }),
    };
  }

  return {
    user,
    response: null,
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { boardId } = await params;
  const access = await requirePresenceAccess(boardId);

  if (access.response || !access.user) {
    return access.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = presencePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return new Response("Payload de presencia inválido.", {
      status: 400,
    });
  }

  if (parsed.data.activeCardId) {
    const card = await prisma.card.findFirst({
      where: {
        id: parsed.data.activeCardId,
        boardId,
      },
      select: {
        id: true,
      },
    });

    if (!card) {
      return new Response("La tarjeta indicada no pertenece a este tablero.", {
        status: 400,
      });
    }
  }

  await Promise.all([
    pruneBoardPresence(boardId),
    upsertBoardPresence({
      boardId,
      userId: access.user.id,
      clientId: parsed.data.clientId,
      activeCardId: parsed.data.activeCardId ?? null,
    }),
  ]);

  const presence = await getBoardPresence(boardId);
  publishBoardPresence(boardId, presence);

  return new Response(null, {
    status: 204,
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { boardId } = await params;
  const access = await requirePresenceAccess(boardId);

  if (access.response || !access.user) {
    return access.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = presencePayloadSchema.pick({ clientId: true }).safeParse(body);

  if (!parsed.success) {
    return new Response("Payload de presencia inválido.", {
      status: 400,
    });
  }

  await Promise.all([
    pruneBoardPresence(boardId),
    removeBoardPresence({
      boardId,
      userId: access.user.id,
      clientId: parsed.data.clientId,
    }),
  ]);

  const presence = await getBoardPresence(boardId);
  publishBoardPresence(boardId, presence);

  return new Response(null, {
    status: 204,
  });
}
