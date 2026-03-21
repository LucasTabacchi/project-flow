"use server";

import { revalidatePath } from "next/cache";

import {
  failure,
  fromZodError,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { touchBoard } from "@/lib/board-realtime";
import { serializeBoardCustomField } from "@/lib/custom-fields";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import {
  createBoardCustomFieldSchema,
  deleteBoardCustomFieldSchema,
  updateBoardCustomFieldSchema,
} from "@/lib/validators/custom-fields";
import type { BoardCustomFieldView } from "@/types";

async function requireOwnerBoard(boardId: string, userId: string) {
  const membership = await getBoardMembership(boardId, userId);

  if (!membership) {
    return null;
  }

  if (membership.role !== "OWNER") {
    return "forbidden" as const;
  }

  return membership;
}

function normalizeOptions(options: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const option of options.map((entry) => entry.trim()).filter(Boolean)) {
    const key = option.toLocaleLowerCase("es");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(option);
  }

  return normalized;
}

async function listBoardCustomFields(boardId: string): Promise<BoardCustomFieldView[]> {
  const fields = await prisma.boardCustomField.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      options: true,
      position: true,
    },
  });

  return fields.map((field) => serializeBoardCustomField(field));
}

export async function createBoardCustomFieldAction(
  input: unknown,
): Promise<ActionResult<{ customFields: BoardCustomFieldView[]; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = createBoardCustomFieldSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireOwnerBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Solo el propietario puede gestionar campos personalizados.");
  }

  const options =
    parsed.data.type === "SELECT" ? normalizeOptions(parsed.data.options) : [];

  const existingField = await prisma.boardCustomField.findFirst({
    where: {
      boardId: parsed.data.boardId,
      name: {
        equals: parsed.data.name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingField) {
    return failure("Ya existe un campo con ese nombre.");
  }

  const position = await prisma.boardCustomField.count({
    where: { boardId: parsed.data.boardId },
  });

  await prisma.boardCustomField.create({
    data: {
      boardId: parsed.data.boardId,
      name: parsed.data.name,
      type: parsed.data.type,
      options,
      position,
    },
  });

  const [customFields, boardUpdatedAt] = await Promise.all([
    listBoardCustomFields(parsed.data.boardId),
    touchBoard(parsed.data.boardId),
  ]);

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      customFields,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Campo personalizado creado.",
  );
}

export async function updateBoardCustomFieldAction(
  input: unknown,
): Promise<ActionResult<{ customFields: BoardCustomFieldView[]; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = updateBoardCustomFieldSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireOwnerBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Solo el propietario puede gestionar campos personalizados.");
  }

  const field = await prisma.boardCustomField.findFirst({
    where: {
      id: parsed.data.fieldId,
      boardId: parsed.data.boardId,
    },
    select: {
      id: true,
      type: true,
      options: true,
    },
  });

  if (!field) {
    return failure("El campo indicado no pertenece a este tablero.");
  }

  const duplicatedField = await prisma.boardCustomField.findFirst({
    where: {
      boardId: parsed.data.boardId,
      id: {
        not: parsed.data.fieldId,
      },
      name: {
        equals: parsed.data.name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (duplicatedField) {
    return failure("Ya existe otro campo con ese nombre.");
  }

  const nextOptions =
    parsed.data.type === "SELECT" ? normalizeOptions(parsed.data.options) : [];

  await prisma.$transaction(async (tx) => {
    await tx.boardCustomField.update({
      where: {
        id: parsed.data.fieldId,
      },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        options: nextOptions,
      },
    });

    if (field.type !== parsed.data.type) {
      await tx.cardCustomFieldValue.deleteMany({
        where: {
          fieldId: parsed.data.fieldId,
        },
      });
      return;
    }

    if (parsed.data.type === "SELECT") {
      await tx.cardCustomFieldValue.deleteMany({
        where: {
          fieldId: parsed.data.fieldId,
          optionValue: {
            notIn: nextOptions,
          },
        },
      });
    }
  });

  const [customFields, boardUpdatedAt] = await Promise.all([
    listBoardCustomFields(parsed.data.boardId),
    touchBoard(parsed.data.boardId),
  ]);

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      customFields,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Campo personalizado actualizado.",
  );
}

export async function deleteBoardCustomFieldAction(
  input: unknown,
): Promise<ActionResult<{ customFields: BoardCustomFieldView[]; boardUpdatedAt: string }>> {
  const user = await requireUser();
  const parsed = deleteBoardCustomFieldSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireOwnerBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Solo el propietario puede gestionar campos personalizados.");
  }

  const orderedFields = await prisma.boardCustomField.findMany({
    where: {
      boardId: parsed.data.boardId,
    },
    orderBy: {
      position: "asc",
    },
    select: {
      id: true,
    },
  });

  const exists = orderedFields.some((field) => field.id === parsed.data.fieldId);

  if (!exists) {
    return failure("El campo indicado no pertenece a este tablero.");
  }

  const remainingIds = orderedFields
    .filter((field) => field.id !== parsed.data.fieldId)
    .map((field) => field.id);

  await prisma.$transaction([
    prisma.boardCustomField.delete({
      where: {
        id: parsed.data.fieldId,
      },
    }),
    ...remainingIds.map((fieldId, index) =>
      prisma.boardCustomField.update({
        where: { id: fieldId },
        data: { position: index },
      }),
    ),
  ]);

  const [customFields, boardUpdatedAt] = await Promise.all([
    listBoardCustomFields(parsed.data.boardId),
    touchBoard(parsed.data.boardId),
  ]);

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      customFields,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Campo personalizado eliminado.",
  );
}
