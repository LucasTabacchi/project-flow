"use server";

import { revalidatePath } from "next/cache";

import {
  failure,
  fromZodError,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { touchBoard, touchCard } from "@/lib/board-realtime";
import {
  getBoardCardSummary,
  getBoardMembership,
  getCardDetail,
} from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import { canEditBoard } from "@/lib/permissions";
import { createNotification, createNotifications } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import {
  addChecklistItemSchema,
  addChecklistSchema,
  addCommentSchema,
  createAttachmentSchema,
  createCardSchema,
  deleteCardSchema,
  reorderCardsSchema,
  toggleChecklistItemSchema,
  updateCardSchema,
} from "@/lib/validators/card";

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

function hasUniqueIds(values: string[]) {
  return new Set(values).size === values.length;
}

async function getBoardListRecord(boardId: string, listId: string) {
  return prisma.list.findFirst({
    where: {
      id: listId,
      boardId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

async function getBoardCardRecord(boardId: string, cardId: string) {
  return prisma.card.findFirst({
    where: {
      id: cardId,
      boardId,
    },
    select: {
      id: true,
      listId: true,
      completedAt: true,
      assignments: {
        select: { userId: true },
      },
    },
  });
}

async function getBoardChecklistRecord(boardId: string, checklistId: string) {
  return prisma.cardChecklist.findFirst({
    where: {
      id: checklistId,
      card: {
        boardId,
      },
    },
    select: {
      id: true,
      cardId: true,
    },
  });
}

async function getBoardChecklistItemRecord(boardId: string, itemId: string) {
  return prisma.checklistItem.findFirst({
    where: {
      id: itemId,
      checklist: {
        card: {
          boardId,
        },
      },
    },
    select: {
      id: true,
      checklist: {
        select: {
          cardId: true,
        },
      },
    },
  });
}

async function validateCardRelations(input: {
  boardId: string;
  labelIds: string[];
  assigneeIds: string[];
}) {
  const labelIds = [...new Set(input.labelIds)];
  const assigneeIds = [...new Set(input.assigneeIds)];

  const [labels, assignees] = await Promise.all([
    labelIds.length
      ? prisma.label.findMany({
          where: {
            boardId: input.boardId,
            id: {
              in: labelIds,
            },
          },
          select: {
            id: true,
          },
        })
      : [],
    assigneeIds.length
      ? prisma.boardMember.findMany({
          where: {
            boardId: input.boardId,
            userId: {
              in: assigneeIds,
            },
          },
          select: {
            userId: true,
          },
        })
      : [],
  ]);

  if (labels.length !== labelIds.length) {
    return {
      ok: false as const,
      message: "Hay etiquetas que no pertenecen a este tablero.",
    };
  }

  if (assignees.length !== assigneeIds.length) {
    return {
      ok: false as const,
      message: "Hay responsables que no pertenecen a este tablero.",
    };
  }

  return {
    ok: true as const,
    labelIds,
    assigneeIds,
  };
}

export async function getCardDetailAction(
  boardId: string,
  cardId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCardDetail>>>> {
  const user = await requireUser();
  const detail = await getCardDetail(boardId, cardId, user.id);

  if (!detail) {
    return failure("No pudimos cargar la tarjeta.");
  }

  return success(detail);
}

export async function createCardAction(
  input: unknown,
): Promise<ActionResult<{ cardId: string; card: NonNullable<Awaited<ReturnType<typeof getBoardCardSummary>>>; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = createCardSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede crear tarjetas.");
  }

  const list = await getBoardListRecord(parsed.data.boardId, parsed.data.listId);

  if (!list) {
    return failure("La lista indicada no pertenece a este tablero.");
  }

  const position = await prisma.card.count({
    where: {
      listId: parsed.data.listId,
    },
  });

  const card = await prisma.card.create({
    data: {
      boardId: parsed.data.boardId,
      listId: parsed.data.listId,
      createdById: user.id,
      title: parsed.data.title,
      position,
    },
  });

  const [summary, boardUpdatedAt] = await Promise.all([
    getBoardCardSummary(parsed.data.boardId, card.id),
    touchBoard(parsed.data.boardId),
  ]);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  if (!summary) {
    return failure("La tarjeta se creó pero no pudimos preparar la vista actualizada.");
  }

  logActivity({
    boardId: parsed.data.boardId,
    userId: user.id,
    type: "CARD_CREATED",
    summary: `creó la tarjeta "${parsed.data.title}"`,
    meta: { cardId: card.id, cardTitle: parsed.data.title, listName: list.name },
  });

  return success(
    {
      cardId: card.id,
      card: summary,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Tarjeta creada.",
  );
}

export async function updateCardAction(
  input: unknown,
): Promise<ActionResult<{ detail: NonNullable<Awaited<ReturnType<typeof getCardDetail>>>; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = updateCardSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar tarjetas.");
  }

  const card = await getBoardCardRecord(parsed.data.boardId, parsed.data.cardId);

  if (!card) {
    return failure("La tarjeta indicada no pertenece a este tablero.");
  }

  const relationScope = await validateCardRelations({
    boardId: parsed.data.boardId,
    labelIds: parsed.data.labelIds,
    assigneeIds: parsed.data.assigneeIds,
  });

  if (!relationScope.ok) {
    return failure(relationScope.message);
  }

  // Detect newly assigned users (excluding the actor)
  const previousAssigneeIds = new Set(
    card.assignments?.map((a: { userId: string }) => a.userId) ?? []
  );
  const newlyAssignedIds = relationScope.assigneeIds.filter(
    (id) => !previousAssigneeIds.has(id) && id !== user.id,
  );

  await prisma.card.update({
    where: {
      id: parsed.data.cardId,
    },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      status: parsed.data.status,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      completedAt:
        parsed.data.status === "DONE" ? card.completedAt ?? new Date() : null,
      cardLabels: {
        deleteMany: {},
        createMany: {
          data: relationScope.labelIds.map((labelId) => ({
            labelId,
          })),
        },
      },
      assignments: {
        deleteMany: {},
        createMany: {
          data: relationScope.assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
    },
  });

  const [detail, boardUpdatedAt] = await Promise.all([
    getCardDetail(parsed.data.boardId, parsed.data.cardId, user.id),
    touchBoard(parsed.data.boardId),
  ]);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  // Notificar a usuarios recién asignados (fire-and-forget)
  if (newlyAssignedIds.length && detail) {
    createNotifications(
      newlyAssignedIds.map((assigneeId) => ({
        type: "CARD_ASSIGNED" as const,
        userId: assigneeId,
        actorName: user.name,
        cardTitle: detail.title,
        boardId: parsed.data.boardId,
      })),
    );
  }

  if (!detail) {
    return failure("La tarjeta se actualizó pero no pudimos cargar la vista actualizada.");
  }

  // Log de actividad — detectar qué cambió
  const oldStatus = card.status ?? null;
  const newStatus = parsed.data.status;
  const oldDueDate = card.dueDate ? card.dueDate.toISOString().split("T")[0] : null;
  const newDueDate = parsed.data.dueDate ?? null;

  if (oldStatus !== newStatus) {
    logActivity({
      boardId: parsed.data.boardId,
      userId: user.id,
      type: "CARD_STATUS_CHANGED",
      summary: `cambió el estado de "${detail.title}" a ${newStatus}`,
      meta: { cardId: detail.id, cardTitle: detail.title, oldValue: oldStatus ?? undefined, newValue: newStatus },
    });
  }

  if (newlyAssignedIds.length) {
    logActivity({
      boardId: parsed.data.boardId,
      userId: user.id,
      type: "CARD_ASSIGNED",
      summary: `asignó miembros a "${detail.title}"`,
      meta: { cardId: detail.id, cardTitle: detail.title },
    });
  }

  if (oldDueDate !== newDueDate) {
    if (newDueDate) {
      logActivity({
        boardId: parsed.data.boardId,
        userId: user.id,
        type: "CARD_DUE_DATE_SET",
        summary: `estableció fecha límite en "${detail.title}"`,
        meta: { cardId: detail.id, cardTitle: detail.title, newValue: newDueDate },
      });
    } else {
      logActivity({
        boardId: parsed.data.boardId,
        userId: user.id,
        type: "CARD_DUE_DATE_REMOVED",
        summary: `eliminó la fecha límite de "${detail.title}"`,
        meta: { cardId: detail.id, cardTitle: detail.title },
      });
    }
  }

  return success(
    {
      detail,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Tarjeta actualizada.",
  );
}

export async function deleteCardAction(
  input: unknown,
): Promise<ActionResult<{ cardId: string; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = deleteCardSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede eliminar tarjetas.");
  }

  const card = await getBoardCardRecord(parsed.data.boardId, parsed.data.cardId);

  if (!card) {
    return failure("La tarjeta indicada no pertenece a este tablero.");
  }

  await prisma.card.delete({
    where: {
      id: parsed.data.cardId,
    },
  });

  const boardUpdatedAt = await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      cardId: parsed.data.cardId,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Tarjeta eliminada.",
  );
}

export async function reorderCardsAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reorderCardsSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede mover tarjetas.");
  }

  const providedListIds = parsed.data.lists.map((list) => list.id);
  const providedCardIds = parsed.data.lists.flatMap((list) => list.cardIds);

  if (!hasUniqueIds(providedListIds) || !hasUniqueIds(providedCardIds)) {
    return failure("El orden enviado contiene listas o tarjetas duplicadas.");
  }

  const [boardLists, boardCards] = await Promise.all([
    prisma.list.findMany({
      where: { boardId: parsed.data.boardId },
      select: { id: true, name: true },
    }),
    prisma.card.findMany({
      where: { boardId: parsed.data.boardId },
      select: { id: true, listId: true, title: true },
    }),
  ]);

  if (
    boardLists.length !== providedListIds.length ||
    boardCards.length !== providedCardIds.length
  ) {
    return failure("El tablero cambió mientras movías tarjetas. Actualizá y volvé a intentar.");
  }

  const boardListIds = new Set(boardLists.map((list) => list.id));
  const boardCardIds = new Set(boardCards.map((card) => card.id));

  if (
    providedListIds.some((listId) => !boardListIds.has(listId)) ||
    providedCardIds.some((cardId) => !boardCardIds.has(cardId))
  ) {
    return failure("El orden enviado contiene elementos ajenos a este tablero.");
  }

  // Detectar tarjetas que cambiaron de lista para loggear actividad
  const listNameMap = new Map(boardLists.map((l) => [l.id, l.name]));
  const cardMap = new Map(boardCards.map((c) => [c.id, c]));
  const movedCards: Array<{ cardId: string; cardTitle: string; fromList: string; toList: string }> = [];

  for (const list of parsed.data.lists) {
    for (const cardId of list.cardIds) {
      const card = cardMap.get(cardId);
      if (card && card.listId !== list.id) {
        movedCards.push({
          cardId,
          cardTitle: card.title,
          fromList: listNameMap.get(card.listId) ?? card.listId,
          toList: listNameMap.get(list.id) ?? list.id,
        });
      }
    }
  }

  const updates = parsed.data.lists.flatMap((list) =>
    list.cardIds.map((cardId, index) =>
      prisma.card.update({
        where: { id: cardId },
        data: { listId: list.id, position: index },
      }),
    ),
  );

  await prisma.$transaction(updates);
  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  // Log de actividad para cada tarjeta movida entre listas
  for (const moved of movedCards) {
    logActivity({
      boardId: parsed.data.boardId,
      userId: user.id,
      type: "CARD_MOVED",
      summary: `movió "${moved.cardTitle}" de ${moved.fromList} a ${moved.toList}`,
      meta: {
        cardId: moved.cardId,
        cardTitle: moved.cardTitle,
        fromList: moved.fromList,
        toList: moved.toList,
      },
    });
  }

  return success(undefined, "Tarjetas reordenadas.");
}

export async function addCommentAction(
  input: unknown,
): Promise<ActionResult<{ detail: NonNullable<Awaited<ReturnType<typeof getCardDetail>>>; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = addCommentSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await getBoardMembership(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  const card = await getBoardCardRecord(parsed.data.boardId, parsed.data.cardId);

  if (!card) {
    return failure("La tarjeta indicada no pertenece a este tablero.");
  }

  await prisma.cardComment.create({
    data: {
      cardId: parsed.data.cardId,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

  await touchCard(parsed.data.cardId);
  const [detail, boardUpdatedAt] = await Promise.all([
    getCardDetail(parsed.data.boardId, parsed.data.cardId, user.id),
    touchBoard(parsed.data.boardId),
  ]);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  if (!detail) {
    return failure("El comentario se guardó pero no pudimos cargar la tarjeta actualizada.");
  }

  // Notificar a asignados en la tarjeta (excepto al autor del comentario)
  const assigneesToNotify = card.assignments
    .map((a) => a.userId)
    .filter((id) => id !== user.id);

  if (assigneesToNotify.length) {
    createNotifications(
      assigneesToNotify.map((userId) => ({
        type: "CARD_COMMENT" as const,
        userId,
        actorName: user.name,
        cardTitle: detail.title,
        boardId: parsed.data.boardId,
      })),
    );
  }

  // Detectar menciones @nombre en el cuerpo del comentario
  const mentionMatches = parsed.data.body.match(/@[\w\u00C0-\u024F]+/g) ?? [];
  if (mentionMatches.length) {
    // Buscar miembros del tablero que coincidan con los nombres mencionados
    const boardMembers = await prisma.boardMember.findMany({
      where: { boardId: parsed.data.boardId },
      select: { userId: true, user: { select: { name: true } } },
    });

    const mentionedUserIds = boardMembers
      .filter((m) => {
        const firstName = m.user.name.split(" ")[0].toLowerCase();
        return mentionMatches.some(
          (mention) => mention.slice(1).toLowerCase() === firstName,
        );
      })
      .map((m) => m.userId)
      // No notificar al autor ni a quienes ya recibieron CARD_COMMENT
      .filter((id) => id !== user.id && !assigneesToNotify.includes(id));

    if (mentionedUserIds.length) {
      createNotifications(
        mentionedUserIds.map((userId) => ({
          type: "CARD_MENTION" as const,
          userId,
          actorName: user.name,
          cardTitle: detail.title,
          boardId: parsed.data.boardId,
        })),
      );
    }
  }

  logActivity({
    boardId: parsed.data.boardId,
    userId: user.id,
    type: "CARD_COMMENT_ADDED",
    summary: `comentó en "${detail.title}"`,
    meta: { cardId: detail.id, cardTitle: detail.title },
  });

  return success(
    {
      detail,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Comentario agregado.",
  );
}

export async function addChecklistAction(
  input: unknown,
): Promise<ActionResult<{ detail: NonNullable<Awaited<ReturnType<typeof getCardDetail>>>; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = addChecklistSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar checklists.");
  }

  const card = await getBoardCardRecord(parsed.data.boardId, parsed.data.cardId);

  if (!card) {
    return failure("La tarjeta indicada no pertenece a este tablero.");
  }

  const position = await prisma.cardChecklist.count({
    where: {
      cardId: parsed.data.cardId,
    },
  });

  await prisma.cardChecklist.create({
    data: {
      cardId: parsed.data.cardId,
      title: parsed.data.title,
      position,
    },
  });

  await touchCard(parsed.data.cardId);
  const [detail, boardUpdatedAt] = await Promise.all([
    getCardDetail(parsed.data.boardId, parsed.data.cardId, user.id),
    touchBoard(parsed.data.boardId),
  ]);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  if (!detail) {
    return failure("El checklist se creó pero no pudimos cargar la tarjeta actualizada.");
  }

  return success(
    {
      detail,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Checklist agregado.",
  );
}

export async function addChecklistItemAction(
  input: unknown,
): Promise<ActionResult<{ detail: NonNullable<Awaited<ReturnType<typeof getCardDetail>>>; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = addChecklistItemSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar checklists.");
  }

  const checklist = await getBoardChecklistRecord(
    parsed.data.boardId,
    parsed.data.checklistId,
  );

  if (!checklist) {
    return failure("El checklist indicado no pertenece a este tablero.");
  }

  const position = await prisma.checklistItem.count({
    where: {
      checklistId: parsed.data.checklistId,
    },
  });

  await prisma.checklistItem.create({
    data: {
      checklistId: parsed.data.checklistId,
      title: parsed.data.title,
      position,
    },
  });

  await touchCard(checklist.cardId);
  const [detail, boardUpdatedAt] = await Promise.all([
    getCardDetail(parsed.data.boardId, checklist.cardId, user.id),
    touchBoard(parsed.data.boardId),
  ]);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  if (!detail) {
    return failure("El item se creó pero no pudimos cargar la tarjeta actualizada.");
  }

  return success(
    {
      detail,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Item agregado.",
  );
}

export async function toggleChecklistItemAction(
  input: unknown,
): Promise<ActionResult<{ detail: NonNullable<Awaited<ReturnType<typeof getCardDetail>>>; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = toggleChecklistItemSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar checklists.");
  }

  const checklistItem = await getBoardChecklistItemRecord(
    parsed.data.boardId,
    parsed.data.itemId,
  );

  if (!checklistItem) {
    return failure("El item indicado no pertenece a este tablero.");
  }

  const item = await prisma.checklistItem.update({
    where: {
      id: parsed.data.itemId,
    },
    data: {
      isCompleted: parsed.data.isCompleted,
      completedAt: parsed.data.isCompleted ? new Date() : null,
      completedById: parsed.data.isCompleted ? user.id : null,
    },
    select: {
      checklist: {
        select: {
          cardId: true,
        },
      },
    },
  });

  await touchCard(item.checklist.cardId);
  const [detail, boardUpdatedAt] = await Promise.all([
    getCardDetail(parsed.data.boardId, item.checklist.cardId, user.id),
    touchBoard(parsed.data.boardId),
  ]);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  if (!detail) {
    return failure("El checklist se actualizó pero no pudimos cargar la tarjeta actualizada.");
  }

  return success(
    {
      detail,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Checklist actualizado.",
  );
}

export async function createAttachmentAction(
  input: unknown,
): Promise<ActionResult<{ detail: NonNullable<Awaited<ReturnType<typeof getCardDetail>>>; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = createAttachmentSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede agregar adjuntos.");
  }

  const card = await getBoardCardRecord(parsed.data.boardId, parsed.data.cardId);

  if (!card) {
    return failure("La tarjeta indicada no pertenece a este tablero.");
  }

  await prisma.attachment.create({
    data: {
      cardId: parsed.data.cardId,
      name: parsed.data.name,
      url: parsed.data.url,
      uploadedById: user.id,
    },
  });

  await touchCard(parsed.data.cardId);
  const [detail, boardUpdatedAt] = await Promise.all([
    getCardDetail(parsed.data.boardId, parsed.data.cardId, user.id),
    touchBoard(parsed.data.boardId),
  ]);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  if (!detail) {
    return failure("El adjunto se agregó pero no pudimos cargar la tarjeta actualizada.");
  }

  return success(
    {
      detail,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Adjunto agregado.",
  );
}
