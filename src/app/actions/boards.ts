"use server";

import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import { ActivityType } from "@prisma/client";
import { enqueueBoardEmailNotificationJob } from "@/lib/board-email-notifications";
import { fireBoardWebhooks } from "@/app/actions/webhooks";

import {
  failure,
  fromZodError,
  success,
  type ActionResult,
} from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { publishBoardRemoved, touchBoard } from "@/lib/board-realtime";
import { prisma } from "@/lib/db";
import { buildInvitationUrl, sendBoardInvitationEmail } from "@/lib/email";
import { canEditBoard, canManageMembers } from "@/lib/permissions";
import { logError, logWarn } from "@/lib/observability";
import { getPrismaErrorMessage } from "@/lib/prisma-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { getBoardMembership } from "@/lib/data/boards";
import type { BoardInvitationView, BoardListView, LabelView } from "@/types";
import {
  createBoardSchema,
  createLabelSchema,
  createListSchema,
  deleteBoardSchema,
  leaveBoardSchema,
  deleteListSchema,
  inviteMemberSchema,
  reorderListsSchema,
  respondInvitationSchema,
  respondInvitationByTokenSchema,
  updateBoardSchema,
  updateListSchema,
} from "@/lib/validators/board";

const INVITE_RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const INVITE_RATE_LIMIT_MAX_ATTEMPTS = 12;

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

async function getClientAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return (
    headerStore.get("x-real-ip") ??
    headerStore.get("cf-connecting-ip") ??
    "unknown"
  );
}

async function isInviteRateLimited(input: {
  boardId: string;
  userId: string;
  email: string;
}) {
  const clientAddress = await getClientAddress();
  const result = checkRateLimit({
    scope: "board.invite",
    key: `${clientAddress}:${input.userId}:${input.boardId}`,
    limit: INVITE_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: INVITE_RATE_LIMIT_WINDOW_MS,
  });

  if (!result.ok) {
    logWarn("board.invite.rate_limited", {
      boardId: input.boardId,
      userId: input.userId,
      email: input.email,
      clientAddress,
      resetAt: result.resetAt,
    });
  }

  return !result.ok;
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
  invitedById: string;
  board: { name: string };
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
      invitedById: true,
      board: {
        select: {
          name: true,
        },
      },
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

export async function updateBoardAction(
  input: unknown,
): Promise<ActionResult<{ boardUpdatedAt: string }>> {
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

  const boardUpdatedAt = await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);
  revalidatePath("/dashboard");

  return success(
    {
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Tablero actualizado.",
  );
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
  await publishBoardRemoved(parsed.data.boardId);

  revalidatePath("/dashboard");

  return success(undefined, "Tablero eliminado.");
}

export async function leaveBoardAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leaveBoardSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const membership = await getBoardMembership(parsed.data.boardId, user.id);

  if (!membership) {
    return failure("No tenés acceso a este tablero.");
  }

  if (membership.role === "OWNER") {
    return failure("El propietario no puede abandonar el tablero. Transferí la propiedad o eliminá el tablero.");
  }

  await prisma.boardMember.delete({
    where: {
      boardId_userId: {
        boardId: parsed.data.boardId,
        userId: user.id,
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Abandonaste el tablero.");
}

export async function createListAction(
  input: unknown,
): Promise<ActionResult<{ listId: string; list: BoardListView; boardUpdatedAt: string }>> {
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

  const boardUpdatedAt = await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  logActivity({
    boardId: parsed.data.boardId,
    userId: user.id,
    type: ActivityType.LIST_CREATED,
    summary: `creó la lista "${parsed.data.name}"`,
    meta: { listName: parsed.data.name },
  });
  fireBoardWebhooks(parsed.data.boardId, "list.created", {
    listId: list.id,
    listName: list.name,
    createdBy: user.name,
  });
  enqueueBoardEmailNotificationJob(parsed.data.boardId, "list.created", {
    listId: list.id,
    listName: list.name,
    createdBy: user.name,
  });

  return success(
    {
      listId: list.id,
      list: {
        id: list.id,
        name: list.name,
        position: list.position,
        cards: [],
      },
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Lista creada.",
  );
}

export async function updateListAction(
  input: unknown,
): Promise<ActionResult<{ listId: string; name: string; boardUpdatedAt: string }>> {
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

  const list = await getBoardListRecord(parsed.data.boardId, parsed.data.listId);

  if (!list) {
    return failure("La lista indicada no pertenece a este tablero.");
  }

  await prisma.list.update({
    where: {
      id: parsed.data.listId,
    },
    data: {
      name: parsed.data.name,
    },
  });

  const boardUpdatedAt = await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      listId: parsed.data.listId,
      name: parsed.data.name,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Lista actualizada.",
  );
}

export async function deleteListAction(
  input: unknown,
): Promise<ActionResult<{ listId: string; boardUpdatedAt: string }>> {
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

  const list = await getBoardListRecord(parsed.data.boardId, parsed.data.listId);

  if (!list) {
    return failure("La lista indicada no pertenece a este tablero.");
  }

  await prisma.list.delete({
    where: {
      id: parsed.data.listId,
    },
  });

  const boardUpdatedAt = await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      listId: parsed.data.listId,
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Lista eliminada.",
  );
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

  if (!hasUniqueIds(parsed.data.orderedIds)) {
    return failure("El orden de listas contiene duplicados.");
  }

  const boardLists = await prisma.list.findMany({
    where: {
      boardId: parsed.data.boardId,
    },
    select: {
      id: true,
    },
  });

  if (boardLists.length !== parsed.data.orderedIds.length) {
    return failure("El tablero cambió mientras reordenabas las listas. Intentá de nuevo.");
  }

  const boardListIds = new Set(boardLists.map((list) => list.id));

  if (parsed.data.orderedIds.some((listId) => !boardListIds.has(listId))) {
    return failure("El orden enviado contiene listas que no pertenecen al tablero.");
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

  await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Orden actualizado.");
}

export async function createLabelAction(
  input: unknown,
): Promise<ActionResult<{ label: LabelView; boardUpdatedAt: string }>> {
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

  const existingLabel = await prisma.label.findFirst({
    where: {
      boardId: parsed.data.boardId,
      name: parsed.data.name,
    },
  });

  if (existingLabel) {
    return failure("Ya existe una etiqueta con ese nombre.");
  }

  const createdLabel = await prisma.label.create({
    data: parsed.data,
  });

  const boardUpdatedAt = await touchBoard(parsed.data.boardId);
  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      label: {
        id: createdLabel.id,
        name: createdLabel.name,
        color: createdLabel.color,
      },
      boardUpdatedAt: boardUpdatedAt.toISOString(),
    },
    "Etiqueta creada.",
  );
}

export async function inviteMemberAction(
  input: unknown,
): Promise<ActionResult<{
  emailSent: boolean;
  inviteUrl: string;
  invitation?: BoardInvitationView;
  boardUpdatedAt?: string;
}>> {
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

  if (parsed.data.email === user.email) {
    return failure("No podés enviarte una invitación a vos mismo.");
  }

  if (
    await isInviteRateLimited({
      boardId: parsed.data.boardId,
      userId: user.id,
      email: parsed.data.email,
    })
  ) {
    return failure("Se alcanzó el límite de invitaciones recientes. Esperá un momento antes de volver a intentar.");
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
      const boardUpdatedAt = await touchBoard(parsed.data.boardId);
      revalidateInvitationPaths(parsed.data.boardId, invitation.token);

      return success(
        {
          emailSent: false,
          inviteUrl: `/invite/${invitation.token}`,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role as "OWNER" | "EDITOR" | "VIEWER",
            status: invitation.status,
            invitedByName: user.name,
            expiresAt: invitation.expiresAt.toISOString(),
          },
          boardUpdatedAt: boardUpdatedAt.toISOString(),
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

    const boardUpdatedAt = await touchBoard(parsed.data.boardId);
    revalidateInvitationPaths(parsed.data.boardId, invitation.token);

    if (!emailResult.sent) {
      return success(
        {
          emailSent: false,
          inviteUrl,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role as "OWNER" | "EDITOR" | "VIEWER",
            status: invitation.status,
            invitedByName: user.name,
            expiresAt: invitation.expiresAt.toISOString(),
          },
          boardUpdatedAt: boardUpdatedAt.toISOString(),
        },
        emailResult.reason,
      );
    }

    return success(
      {
        emailSent: true,
        inviteUrl,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role as "OWNER" | "EDITOR" | "VIEWER",
          status: invitation.status,
          invitedByName: user.name,
          expiresAt: invitation.expiresAt.toISOString(),
        },
        boardUpdatedAt: boardUpdatedAt.toISOString(),
      },
      "Invitación enviada por email.",
    );
  } catch (error) {
    logError("board.invite.failed", {
      boardId: parsed.data.boardId,
      userId: user.id,
      email: parsed.data.email,
      error,
    });

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
    await touchBoard(invitation.boardId);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    logActivity({
      boardId: invitation.boardId,
      userId: user.id,
      type: ActivityType.MEMBER_JOINED,
      summary: `se unió al tablero`,
    });
    fireBoardWebhooks(invitation.boardId, "member.joined", {
      memberUserId: user.id,
      memberName: user.name,
      memberEmail: user.email,
      role: invitation.role,
      joinedBy: user.name,
    });
    enqueueBoardEmailNotificationJob(invitation.boardId, "member.joined", {
      memberUserId: user.id,
      memberName: user.name,
      memberEmail: user.email,
      role: invitation.role,
      joinedBy: user.name,
    });

    // Notificar al owner que alguien aceptó
    createNotification({
      type: "INVITATION_ACCEPTED",
      userId: invitation.invitedById,
      actorName: user.name,
      boardName: invitation.board.name,
      boardId: invitation.boardId,
    });

    return success({ boardId: invitation.boardId }, "Invitación aceptada.");
  } catch (error) {
    logError("board.invitation.accept.failed", {
      invitationId: parsed.data.invitationId,
      userId: user.id,
      error,
    });

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
    await touchBoard(invitation.boardId);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    // Notificar al owner que alguien rechazó
    createNotification({
      type: "INVITATION_DECLINED",
      userId: invitation.invitedById,
      actorName: user.name,
      boardName: invitation.board.name,
      boardId: invitation.boardId,
    });

    return success(undefined, "Invitación rechazada.");
  } catch (error) {
    logError("board.invitation.decline.failed", {
      invitationId: parsed.data.invitationId,
      userId: user.id,
      error,
    });

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
    await touchBoard(invitation.boardId);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    // Notificar al owner que alguien aceptó vía token
    createNotification({
      type: "INVITATION_ACCEPTED",
      userId: invitation.invitedById,
      actorName: user.name,
      boardName: invitation.board.name,
      boardId: invitation.boardId,
    });

    logActivity({
      boardId: invitation.boardId,
      userId: user.id,
      type: ActivityType.MEMBER_JOINED,
      summary: `se unió al tablero`,
    });
    fireBoardWebhooks(invitation.boardId, "member.joined", {
      memberUserId: user.id,
      memberName: user.name,
      memberEmail: user.email,
      role: invitation.role,
      joinedBy: user.name,
    });
    enqueueBoardEmailNotificationJob(invitation.boardId, "member.joined", {
      memberUserId: user.id,
      memberName: user.name,
      memberEmail: user.email,
      role: invitation.role,
      joinedBy: user.name,
    });

    return success({ boardId: invitation.boardId }, "Invitación aceptada.");
  } catch (error) {
    logError("board.invitation.accept_by_token.failed", {
      token: parsed.data.token,
      userId: user.id,
      error,
    });

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
    await touchBoard(invitation.boardId);
    revalidateInvitationPaths(invitation.boardId, invitation.token);

    // Notificar al owner que alguien rechazó vía token
    createNotification({
      type: "INVITATION_DECLINED",
      userId: invitation.invitedById,
      actorName: user.name,
      boardName: invitation.board.name,
      boardId: invitation.boardId,
    });

    return success(undefined, "Invitación rechazada.");
  } catch (error) {
    logError("board.invitation.decline_by_token.failed", {
      token: parsed.data.token,
      userId: user.id,
      error,
    });

    return failure(
      getPrismaErrorMessage(
        error,
        "No pudimos rechazar la invitación en este momento. Intentá de nuevo en unos minutos.",
      ),
    );
  }
}
