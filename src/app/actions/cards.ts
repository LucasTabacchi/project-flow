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
import { getBoardMembership, getCardDetail } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import { canEditBoard } from "@/lib/permissions";
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
): Promise<ActionResult<{ cardId: string }>> {
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

  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success({ cardId: card.id }, "Tarjeta creada.");
}

export async function updateCardAction(input: unknown): Promise<ActionResult> {
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

  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Tarjeta actualizada.");
}

export async function deleteCardAction(input: unknown): Promise<ActionResult> {
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

  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Tarjeta eliminada.");
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
      where: {
        boardId: parsed.data.boardId,
      },
      select: {
        id: true,
      },
    }),
    prisma.card.findMany({
      where: {
        boardId: parsed.data.boardId,
      },
      select: {
        id: true,
      },
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

  const updates = parsed.data.lists.flatMap((list) =>
    list.cardIds.map((cardId, index) =>
      prisma.card.update({
        where: {
          id: cardId,
        },
        data: {
          listId: list.id,
          position: index,
        },
      }),
    ),
  );

  await prisma.$transaction(updates);

  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Tarjetas reordenadas.");
}

export async function addCommentAction(input: unknown): Promise<ActionResult> {
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
  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Comentario agregado.");
}

export async function addChecklistAction(input: unknown): Promise<ActionResult> {
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
  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Checklist agregado.");
}

export async function addChecklistItemAction(
  input: unknown,
): Promise<ActionResult> {
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
  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Item agregado.");
}

export async function toggleChecklistItemAction(
  input: unknown,
): Promise<ActionResult> {
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
  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Checklist actualizado.");
}

export async function createAttachmentAction(
  input: unknown,
): Promise<ActionResult> {
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
  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Adjunto agregado.");
}
