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
import { buildInvitationUrl, sendBoardInvitationEmail } from "@/lib/email";
import { canEditBoard, canManageMembers } from "@/lib/permissions";
import { getPrismaErrorMessage } from "@/lib/prisma-error";
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
  respondInvitationByTokenSchema,
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

type PendingInvitationRecord = {
  id: string;
  boardId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  token: string;
  expiresAt: Date;
};

function isInvitationExpired(expiresAt: Date) {
  return expiresAt <= new Date();
}

async function expireInvitation(invitationId: string) {
  await prisma.boardInvitation
    .update({
      where: {
        id: invitationId,
      },
      data: {
        status: "EXPIRED",
      },
    })
    .catch(() => undefined);
}

async function getPendingInvitationForEmail(
  where:
    | {
        id: string;
      }
    | {
        token: string;
      },
  email: string,
) {
  const invitation = await prisma.boardInvitation.findFirst({
    where: {
      ...where,
      email,
      status: "PENDING",
    },
    select: {
      id: true,
      boardId: true,
      role: true,
      token: true,
      expiresAt: true,
    },
  });

  if (!invitation) {
    return null;
  }

  if (isInvitationExpired(invitation.expiresAt)) {
    await expireInvitation(invitation.id);
    return "expired" as const;
  }

  return invitation satisfies PendingInvitationRecord;
}

async function acceptInvitationRecord(
  invitation: PendingInvitationRecord,
  user: Awaited<ReturnType<typeof requireUser>>,
) {
  await prisma.$transaction(async (tx) => {
    const existingMember = await tx.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: invitation.boardId,
          userId: user.id,
        },
      },
    });

    if (!existingMember) {
      await tx.boardMember.create({
        data: {
          boardId: invitation.boardId,
          userId: user.id,
          role: invitation.role,
        },
      });
    }

    await tx.boardInvitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "ACCEPTED",
        inviteeId: user.id,
      },
    });
  });
}

async function declineInvitationRecord(
  invitation: PendingInvitationRecord,
  userId: string,
) {
  await prisma.boardInvitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      status: "DECLINED",
      inviteeId: userId,
    },
  });
}

function revalidateInvitationPaths(boardId: string, token: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/boards/${boardId}`);
  revalidatePath(`/invite/${token}`);
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

export async function inviteMemberAction(
  input: unknown,
): Promise<ActionResult<{ emailSent: boolean; inviteUrl: string }>> {
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

  try {
    const now = new Date();
    const expiresAt = addDays(now, 10);
    const [existingUser, existingMember, existingInvitation, board] =
      await Promise.all([
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
        },
      }),
      prisma.board.findUnique({
        where: {
          id: parsed.data.boardId,
        },
        select: {
          name: true,
        },
      }),
    ]);

    if (existingMember) {
      return failure("Ese usuario ya es miembro del tablero.");
    }

    if (!board) {
      return failure("No encontramos el tablero a invitar.");
    }

    if (
      existingInvitation?.status === "PENDING" &&
      !isInvitationExpired(existingInvitation.expiresAt)
    ) {
      return failure("Ya existe una invitación pendiente para ese email.");
    }

    const invitationToken = randomUUID();
    const invitation = existingInvitation
      ? await prisma.boardInvitation.update({
          where: {
            id: existingInvitation.id,
          },
          data: {
            role: parsed.data.role as "EDITOR" | "VIEWER",
            invitedById: user.id,
            inviteeId: existingUser?.id,
            token: invitationToken,
            expiresAt,
            status: "PENDING",
          },
        })
      : await prisma.boardInvitation.create({
          data: {
            boardId: parsed.data.boardId,
            email: parsed.data.email,
            role: parsed.data.role as "EDITOR" | "VIEWER",
            invitedById: user.id,
            inviteeId: existingUser?.id,
            token: invitationToken,
            expiresAt,
          },
        });

    const inviteUrl = buildInvitationUrl(invitation.token);

    if (!inviteUrl) {
      revalidateInvitationPaths(parsed.data.boardId, invitation.token);

      return success(
        {
          emailSent: false,
          inviteUrl: `/invite/${invitation.token}`,
        },
        "Invitación creada. Configurá APP_URL para generar el enlace público y enviarlo por email.",
      );
    }

    const emailResult = await sendBoardInvitationEmail({
      to: parsed.data.email,
      boardName: board.name,
      invitedByName: user.name,
      inviteUrl,
      expiresAt,
      role: parsed.data.role as "EDITOR" | "VIEWER",
    });

    revalidateInvitationPaths(parsed.data.boardId, invitation.token);

    if (!emailResult.sent) {
      return success(
        {
          emailSent: false,
          inviteUrl,
        },
        emailResult.reason,
      );
    }

    return success(
      {
        emailSent: true,
        inviteUrl,
      },
      "Invitación enviada por email.",
    );
  } catch (error) {
    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos enviar la invitación en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}

export async function acceptInvitationAction(
  input: unknown,
): Promise<ActionResult<{ boardId: string }>> {
  const user = await requireUser();
  const parsed = respondInvitationSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  try {
    const invitation = await getPendingInvitationForEmail(
      { id: parsed.data.invitationId },
      user.email,
    );

    if (!invitation) {
      return failure("La invitación ya no está disponible.");
    }

    if (invitation === "expired") {
      return failure("La invitación venció. Pedile al propietario que te envíe una nueva.");
    }

    await acceptInvitationRecord(invitation, user);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    return success({ boardId: invitation.boardId }, "Invitación aceptada.");
  } catch (error) {
    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos aceptar la invitación en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}

export async function declineInvitationAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = respondInvitationSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  try {
    const invitation = await getPendingInvitationForEmail(
      { id: parsed.data.invitationId },
      user.email,
    );

    if (!invitation) {
      return failure("La invitación ya no está disponible.");
    }

    if (invitation === "expired") {
      return failure("La invitación venció. Pedile al propietario que te envíe una nueva.");
    }

    await declineInvitationRecord(invitation, user.id);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    return success(undefined, "Invitación rechazada.");
  } catch (error) {
    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos rechazar la invitación en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}

export async function acceptInvitationByTokenAction(
  input: unknown,
): Promise<ActionResult<{ boardId: string }>> {
  const user = await requireUser();
  const parsed = respondInvitationByTokenSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  try {
    const invitation = await getPendingInvitationForEmail(
      { token: parsed.data.token },
      user.email,
    );

    if (!invitation) {
      return failure("La invitación ya no está disponible para esta cuenta.");
    }

    if (invitation === "expired") {
      return failure("La invitación venció. Pedile al propietario que te envíe una nueva.");
    }

    await acceptInvitationRecord(invitation, user);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    return success({ boardId: invitation.boardId }, "Invitación aceptada.");
  } catch (error) {
    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos aceptar la invitación en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}

export async function declineInvitationByTokenAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = respondInvitationByTokenSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  try {
    const invitation = await getPendingInvitationForEmail(
      { token: parsed.data.token },
      user.email,
    );

    if (!invitation) {
      return failure("La invitación ya no está disponible para esta cuenta.");
    }

    if (invitation === "expired") {
      return failure("La invitación venció. Pedile al propietario que te envíe una nueva.");
    }

    await declineInvitationRecord(invitation, user.id);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    return success(undefined, "Invitación rechazada.");
  } catch (error) {
    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos rechazar la invitación en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}
