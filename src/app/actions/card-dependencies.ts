"use server";

import { revalidatePath } from "next/cache";
import { ActivityType } from "@prisma/client";

import {
  failure,
  fromZodError,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth/session";
import { touchBoard } from "@/lib/board-realtime";
import { getBoardMembership, getCardDetail } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import { canEditBoard } from "@/lib/permissions";
import {
  createCardDependencySchema,
  deleteCardDependencySchema,
} from "@/lib/validators/card-dependency";

type CardDetailActionPayload = {
  detail: NonNullable<Awaited<ReturnType<typeof getCardDetail>>>;
  boardUpdatedAt: string;
};

async function requireEditableBoard(boardId: string, userId: string) {
  const membership = await getBoardMembership(boardId, userId);

  if (!membership) {
    return null;
  }

  if (!canEditBoard(membership.role)) {
    return "forbidden" as const;
  }

  return membership;
}

function wouldCreateDependencyCycle(
  edges: Array<{ blockerCardId: string; blockedCardId: string }>,
  blockerCardId: string,
  blockedCardId: string,
) {
  const graph = new Map<string, string[]>();

  for (const edge of edges) {
    const next = graph.get(edge.blockerCardId) ?? [];
    next.push(edge.blockedCardId);
    graph.set(edge.blockerCardId, next);
  }

  const visited = new Set<string>();
  const stack = [blockedCardId];

  while (stack.length) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    if (current === blockerCardId) {
      return true;
    }

    visited.add(current);

    for (const next of graph.get(current) ?? []) {
      if (!visited.has(next)) {
        stack.push(next);
      }
    }
  }

  return false;
}

async function loadFocusDetail(
  boardId: string,
  focusCardId: string,
  userId: string,
): Promise<ActionResult<CardDetailActionPayload>> {
  const [detail, boardUpdatedAt] = await Promise.all([
    getCardDetail(boardId, focusCardId, userId),
    touchBoard(boardId),
  ]);

  revalidatePath(`/boards/${boardId}`);

  if (!detail) {
    return failure(
      "La dependencia se actualizó, pero no pudimos cargar la tarjeta actualizada.",
    );
  }

  return success({
    detail,
    boardUpdatedAt: boardUpdatedAt.toISOString(),
  });
}

export async function createCardDependencyAction(
  input: unknown,
): Promise<ActionResult<CardDetailActionPayload>> {
  const user = await requireUser();
  const parsed = createCardDependencySchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar dependencias.");
  }

  const [cards, edges, existingDependency] = await Promise.all([
    prisma.card.findMany({
      where: {
        boardId: parsed.data.boardId,
        id: {
          in: [parsed.data.blockerCardId, parsed.data.blockedCardId],
        },
      },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.cardDependency.findMany({
      where: {
        boardId: parsed.data.boardId,
      },
      select: {
        blockerCardId: true,
        blockedCardId: true,
      },
    }),
    prisma.cardDependency.findFirst({
      where: {
        boardId: parsed.data.boardId,
        blockerCardId: parsed.data.blockerCardId,
        blockedCardId: parsed.data.blockedCardId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  const blockerCard = cards.find((card) => card.id === parsed.data.blockerCardId);
  const blockedCard = cards.find((card) => card.id === parsed.data.blockedCardId);

  if (!blockerCard || !blockedCard) {
    return failure("Las tarjetas seleccionadas no pertenecen a este tablero.");
  }

  if (existingDependency) {
    return failure("Esa dependencia ya existe.");
  }

  if (
    wouldCreateDependencyCycle(
      edges,
      parsed.data.blockerCardId,
      parsed.data.blockedCardId,
    )
  ) {
    return failure(
      "Esa relación generaría un ciclo entre tarjetas. Elegí otra dependencia.",
    );
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.cardDependency.create({
      data: {
        boardId: parsed.data.boardId,
        blockerCardId: parsed.data.blockerCardId,
        blockedCardId: parsed.data.blockedCardId,
        createdById: user.id,
      },
    }),
    prisma.card.updateMany({
      where: {
        id: {
          in: [...new Set([parsed.data.focusCardId, blockerCard.id, blockedCard.id])],
        },
      },
      data: {
        updatedAt: now,
      },
    }),
  ]);

  logActivity({
    boardId: parsed.data.boardId,
    userId: user.id,
    type: ActivityType.CARD_DEPENDENCY_ADDED,
    summary: `marcó que "${blockerCard.title}" bloquea a "${blockedCard.title}"`,
    meta: {
      cardId: parsed.data.focusCardId,
      cardTitle:
        parsed.data.focusCardId === blockerCard.id
          ? blockerCard.title
          : blockedCard.title,
      oldValue: blockerCard.title,
      newValue: blockedCard.title,
    },
  });

  const result = await loadFocusDetail(
    parsed.data.boardId,
    parsed.data.focusCardId,
    user.id,
  );

  if (!result.ok) {
    return result;
  }

  return success(result.data, "Dependencia agregada.");
}

export async function deleteCardDependencyAction(
  input: unknown,
): Promise<ActionResult<CardDetailActionPayload>> {
  const user = await requireUser();
  const parsed = deleteCardDependencySchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar dependencias.");
  }

  const dependency = await prisma.cardDependency.findFirst({
    where: {
      id: parsed.data.dependencyId,
      boardId: parsed.data.boardId,
    },
    include: {
      blockerCard: {
        select: {
          id: true,
          title: true,
        },
      },
      blockedCard: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!dependency) {
    return failure("La dependencia ya no existe.");
  }

  if (
    parsed.data.focusCardId !== dependency.blockerCardId &&
    parsed.data.focusCardId !== dependency.blockedCardId
  ) {
    return failure("La tarjeta abierta no participa en esta dependencia.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.cardDependency.delete({
      where: {
        id: dependency.id,
      },
    }),
    prisma.card.updateMany({
      where: {
        id: {
          in: [
            ...new Set([
              parsed.data.focusCardId,
              dependency.blockerCardId,
              dependency.blockedCardId,
            ]),
          ],
        },
      },
      data: {
        updatedAt: now,
      },
    }),
  ]);

  logActivity({
    boardId: parsed.data.boardId,
    userId: user.id,
    type: ActivityType.CARD_DEPENDENCY_REMOVED,
    summary: `eliminó la dependencia entre "${dependency.blockerCard.title}" y "${dependency.blockedCard.title}"`,
    meta: {
      cardId: parsed.data.focusCardId,
      cardTitle:
        parsed.data.focusCardId === dependency.blockerCardId
          ? dependency.blockerCard.title
          : dependency.blockedCard.title,
      oldValue: dependency.blockerCard.title,
      newValue: dependency.blockedCard.title,
    },
  });

  const result = await loadFocusDetail(
    parsed.data.boardId,
    parsed.data.focusCardId,
    user.id,
  );

  if (!result.ok) {
    return result;
  }

  return success(result.data, "Dependencia eliminada.");
}
