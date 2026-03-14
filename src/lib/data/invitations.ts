import "server-only";

import { prisma } from "@/lib/db";
import type { InvitationAccessData, InvitationStatus } from "@/types";

function serializeInvitationStatus(
  status: InvitationStatus,
  expiresAt: Date,
): InvitationStatus {
  if (status === "PENDING" && expiresAt <= new Date()) {
    return "EXPIRED";
  }

  return status;
}

export async function getInvitationAccessData(
  token: string,
): Promise<InvitationAccessData | null> {
  const invitation = await prisma.boardInvitation.findUnique({
    where: {
      token,
    },
    include: {
      board: {
        select: {
          id: true,
          name: true,
          theme: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  const status = serializeInvitationStatus(invitation.status, invitation.expiresAt);

  if (status === "EXPIRED" && invitation.status === "PENDING") {
    await prisma.boardInvitation
      .update({
        where: {
          id: invitation.id,
        },
        data: {
          status,
        },
      })
      .catch(() => undefined);
  }

  return {
    id: invitation.id,
    token: invitation.token,
    email: invitation.email,
    boardId: invitation.board.id,
    boardName: invitation.board.name,
    boardTheme: invitation.board.theme,
    role: invitation.role,
    invitedByName: invitation.invitedBy.name,
    status,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

