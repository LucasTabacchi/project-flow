"use server";

import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

import {
  failure,
  fromZodError,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canEditBoard, canManageMembers } from "@/lib/permissions";
import { getBoardMembership } from "@/lib/data/boards";
import {
  createBoardSchema,
  createLabelSchema,
  createListSchema,
  deleteBoardSchema,
  deleteListSchema,
  inviteMemberSchema,
  reorderListsSchema,
  respondInvitationSchema,
  updateBoardSchema,
  updateListSchema,
} from "@/lib/validators/board";

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

async function requireManageMembers(boardId: string, userId: string) {
  const membership = await getBoardMembership(boardId, userId);

  if (!membership) {
    return null;
  }

  if (!canManageMembers(membership.role)) {
    return "forbidden" as const;
  }

  return membership;
}

export async function createBoardAction(
  input: unknown,
): Promise<ActionResult<{ boardId: string }>> {
  const user = await requireUser();
  const parsed = createBoardSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const board = await prisma.board.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      theme: parsed.data.theme,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
      labels: {
        createMany: {
          data: [
            { name: "Frontend", color: "SKY" },
            { name: "Backend", color: "VIOLET" },
            { name: "Diseño", color: "ROSE" },
            { name: "Urgente", color: "AMBER" },
          ],
        },
      },
      lists: {
        createMany: {
          data: [
            { name: "Backlog", position: 0 },
            { name: "En progreso", position: 1 },
            { name: "En revisión", position: 2 },
            { name: "Hecho", position: 3 },
          ],
        },
      },
    },
  });

  revalidatePath("/dashboard");

  return success({ boardId: board.id }, "Tablero creado.");
}

export async function updateBoardAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateBoardSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar este tablero.");
  }

  await prisma.board.update({
    where: {
      id: parsed.data.boardId,
    },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      theme: parsed.data.theme,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath("/dashboard");

  return success(undefined, "Tablero actualizado.");
}

export async function deleteBoardAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteBoardSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await getBoardMembership(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership.role !== "OWNER") {
    return failure("Solo el propietario puede eliminar el tablero.");
  }

  await prisma.board.delete({
    where: {
      id: parsed.data.boardId,
    },
  });

  revalidatePath("/dashboard");

  return success(undefined, "Tablero eliminado.");
}

export async function createListAction(
  input: unknown,
): Promise<ActionResult<{ listId: string }>> {
  const user = await requireUser();
  const parsed = createListSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede agregar listas.");
  }

  const position = await prisma.list.count({
    where: {
      boardId: parsed.data.boardId,
    },
  });

  const list = await prisma.list.create({
    data: {
      boardId: parsed.data.boardId,
      name: parsed.data.name,
      position,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success({ listId: list.id }, "Lista creada.");
}

export async function updateListAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateListSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede editar listas.");
  }

  await prisma.list.update({
    where: {
      id: parsed.data.listId,
    },
    data: {
      name: parsed.data.name,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Lista actualizada.");
}

export async function deleteListAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteListSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede eliminar listas.");
  }

  await prisma.list.delete({
    where: {
      id: parsed.data.listId,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Lista eliminada.");
}

export async function reorderListsAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reorderListsSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede reordenar listas.");
  }

  await prisma.$transaction(
    parsed.data.orderedIds.map((listId, index) =>
      prisma.list.update({
        where: {
          id: listId,
        },
        data: {
          position: index,
        },
      }),
    ),
  );

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Orden actualizado.");
}

export async function createLabelAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createLabelSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireEditableBoard(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Tu rol no puede crear etiquetas.");
  }

  const label = await prisma.label.findFirst({
    where: {
      boardId: parsed.data.boardId,
      name: parsed.data.name,
    },
  });

  if (label) {
    return failure("Ya existe una etiqueta con ese nombre.");
  }

  await prisma.label.create({
    data: parsed.data,
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Etiqueta creada.");
}

export async function inviteMemberAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = inviteMemberSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await requireManageMembers(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership === "forbidden") {
    return failure("Solo el propietario puede invitar miembros.");
  }

  const [existingUser, existingMember, existingInvitation] = await Promise.all([
    prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
    }),
    prisma.boardMember.findFirst({
      where: {
        boardId: parsed.data.boardId,
        user: {
          email: parsed.data.email,
        },
      },
    }),
    prisma.boardInvitation.findFirst({
      where: {
        boardId: parsed.data.boardId,
        email: parsed.data.email,
        status: "PENDING",
      },
    }),
  ]);

  if (existingMember) {
    return failure("Ese usuario ya es miembro del tablero.");
  }

  if (existingInvitation) {
    return failure("Ya existe una invitación pendiente para ese email.");
  }

  await prisma.boardInvitation.create({
    data: {
      boardId: parsed.data.boardId,
      email: parsed.data.email,
      role: parsed.data.role as "EDITOR" | "VIEWER",
      invitedById: user.id,
      inviteeId: existingUser?.id,
      token: randomUUID(),
      expiresAt: addDays(new Date(), 10),
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath("/dashboard");

  return success(undefined, "Invitación enviada.");
}

export async function acceptInvitationAction(
  input: unknown,
): Promise<ActionResult<{ boardId: string }>> {
  const user = await requireUser();
  const parsed = respondInvitationSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const invitation = await prisma.boardInvitation.findFirst({
    where: {
      id: parsed.data.invitationId,
      email: user.email,
      status: "PENDING",
    },
  });

  if (!invitation) {
    return failure("La invitación ya no está disponible.");
  }

  await prisma.$transaction([
    prisma.boardMember.create({
      data: {
        boardId: invitation.boardId,
        userId: user.id,
        role: invitation.role,
      },
    }),
    prisma.boardInvitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "ACCEPTED",
        inviteeId: user.id,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/boards/${invitation.boardId}`);

  return success({ boardId: invitation.boardId }, "Invitación aceptada.");
}

export async function declineInvitationAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = respondInvitationSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const invitation = await prisma.boardInvitation.findFirst({
    where: {
      id: parsed.data.invitationId,
      email: user.email,
      status: "PENDING",
    },
  });

  if (!invitation) {
    return failure("La invitación ya no está disponible.");
  }

  await prisma.boardInvitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      status: "DECLINED",
      inviteeId: user.id,
    },
  });

  revalidatePath("/dashboard");

  return success(undefined, "Invitación rechazada.");
}
