"use server";

import { revalidatePath } from "next/cache";

import {
  failure,
  fromZodError,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
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
        parsed.data.status === "DONE" ? new Date() : null,
      cardLabels: {
        deleteMany: {},
        createMany: {
          data: parsed.data.labelIds.map((labelId) => ({
            labelId,
          })),
        },
      },
      assignments: {
        deleteMany: {},
        createMany: {
          data: parsed.data.assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
    },
  });

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

  await prisma.card.delete({
    where: {
      id: parsed.data.cardId,
    },
  });

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

  await prisma.cardComment.create({
    data: {
      cardId: parsed.data.cardId,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

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

  await prisma.checklistItem.update({
    where: {
      id: parsed.data.itemId,
    },
    data: {
      isCompleted: parsed.data.isCompleted,
      completedAt: parsed.data.isCompleted ? new Date() : null,
      completedById: parsed.data.isCompleted ? user.id : null,
    },
  });

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

  await prisma.attachment.create({
    data: {
      cardId: parsed.data.cardId,
      name: parsed.data.name,
      url: parsed.data.url,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Adjunto agregado.");
}
