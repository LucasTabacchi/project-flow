import { getBoardPresence } from "@/lib/board-realtime";
import { prisma } from "@/lib/db";
import {
  canDeleteBoard,
  canEditBoard,
  canManageMembers,
} from "@/lib/permissions";
import { isCardOverdue } from "@/lib/utils";
import type {
  BoardMemberView,
  BoardPageData,
  BoardRole,
  CardDetailView,
  CardSummaryView,
  LabelView,
  SidebarBoardSummary,
  UserSummary,
} from "@/types";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}): UserSummary {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

function serializeLabels(
  labels: Array<{
    label: {
      id: string;
      name: string;
      color: LabelView["color"];
    };
  }>,
): LabelView[] {
  return labels.map(({ label }) => ({
    id: label.id,
    name: label.name,
    color: label.color,
  }));
}

function serializeCardSummary(card: {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: CardSummaryView["status"];
  priority: CardSummaryView["priority"];
  updatedAt: Date;
  assignments: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
  }>;
  cardLabels: Array<{
    label: {
      id: string;
      name: string;
      color: LabelView["color"];
    };
  }>;
  comments: Array<{ id: string }>;
  attachments: Array<{ id: string }>;
  checklists: Array<{
    items: Array<{
      isCompleted: boolean;
    }>;
  }>;
}): CardSummaryView {
  const checklistItems = card.checklists.flatMap((checklist) => checklist.items);

  return {
    id: card.id,
    listId: card.listId,
    title: card.title,
    description: card.description,
    dueDate: card.dueDate?.toISOString() ?? null,
    status: card.status,
    priority: card.priority,
    labels: serializeLabels(card.cardLabels),
    assignees: card.assignments.map(({ user }) => serializeUser(user)),
    commentCount: card.comments.length,
    attachmentCount: card.attachments.length,
    checklistCompleted: checklistItems.filter((item) => item.isCompleted).length,
    checklistTotal: checklistItems.length,
    updatedAt: card.updatedAt.toISOString(),
  };
}

function buildStats(
  members: BoardMemberView[],
  lists: Array<{
    cards: CardSummaryView[];
  }>,
) {
  const cards = lists.flatMap((list) => list.cards);

  return {
    totalCards: cards.length,
    completedCards: cards.filter((card) => card.status === "DONE").length,
    overdueCards: cards.filter((card) => isCardOverdue(card.dueDate, card.status))
      .length,
    inProgressCards: cards.filter((card) => card.status === "IN_PROGRESS").length,
    byUser: members.map((member) => ({
      userId: member.userId,
      name: member.name,
      count: cards.filter((card) =>
        card.assignees.some((assignee) => assignee.userId === member.userId),
      ).length,
    })),
  };
}

export async function getBoardMembership(boardId: string, userId: string) {
  return prisma.boardMember.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId,
      },
    },
  });
}

export async function getUserSidebarBoards(
  userId: string,
): Promise<SidebarBoardSummary[]> {
  const boards = await prisma.boardMember.findMany({
    where: {
      userId,
    },
    select: {
      role: true,
      board: {
        select: {
          id: true,
          name: true,
          theme: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      board: {
        updatedAt: "desc",
      },
    },
    take: 6,
  });

  return boards.map((item) => ({
    id: item.board.id,
    name: item.board.name,
    theme: item.board.theme,
    role: item.role as BoardRole,
    updatedAt: item.board.updatedAt.toISOString(),
  }));
}

export async function getBoardPageData(
  boardId: string,
  userId: string,
): Promise<BoardPageData | null> {
  const [membership, presence] = await Promise.all([
    prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
      select: {
        role: true,
        board: {
          include: {
            labels: {
              orderBy: {
                name: "asc",
              },
            },
            members: {
              orderBy: {
                createdAt: "asc",
              },
              include: {
                user: {
                  select: userSummarySelect,
                },
              },
            },
            invitations: {
              where: {
                status: "PENDING",
                expiresAt: {
                  gt: new Date(),
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              include: {
                invitedBy: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            lists: {
              orderBy: {
                position: "asc",
              },
              include: {
                cards: {
                  orderBy: {
                    position: "asc",
                  },
                  include: {
                    assignments: {
                      include: {
                        user: {
                          select: userSummarySelect,
                        },
                      },
                    },
                    cardLabels: {
                      include: {
                        label: true,
                      },
                    },
                    comments: {
                      select: {
                        id: true,
                      },
                    },
                    attachments: {
                      select: {
                        id: true,
                      },
                    },
                    checklists: {
                      include: {
                        items: {
                          select: {
                            isCompleted: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    getBoardPresence(boardId),
  ]);

  if (!membership?.board) {
    return null;
  }

  const role = membership.role as BoardRole;
  const board = membership.board;
  const members: BoardMemberView[] = board.members.map((member) => ({
    ...serializeUser(member.user),
    role: member.role as BoardRole,
  }));

  const lists = board.lists.map((list) => ({
    id: list.id,
    name: list.name,
    position: list.position,
    cards: list.cards.map(serializeCardSummary),
  }));

  return {
    id: board.id,
    name: board.name,
    description: board.description,
    theme: board.theme,
    backgroundColor: board.backgroundColor,
    role,
    permissions: {
      canEdit: canEditBoard(role),
      canManageMembers: canManageMembers(role),
      canDelete: canDeleteBoard(role),
    },
    labels: board.labels.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })),
    members,
    presence,
    invitations: board.invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role as BoardRole,
      status: invitation.status,
      invitedByName: invitation.invitedBy.name,
      expiresAt: invitation.expiresAt.toISOString(),
    })),
    stats: buildStats(members, lists),
    lists,
    updatedAt: board.updatedAt.toISOString(),
  };
}

export async function getCardDetail(
  boardId: string,
  cardId: string,
  userId: string,
): Promise<CardDetailView | null> {
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      boardId,
      board: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      createdBy: {
        select: userSummarySelect,
      },
      assignments: {
        include: {
          user: {
            select: userSummarySelect,
          },
        },
      },
      cardLabels: {
        include: {
          label: true,
        },
      },
      comments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          author: {
            select: userSummarySelect,
          },
        },
      },
      checklists: {
        orderBy: {
          position: "asc",
        },
        include: {
          items: {
            orderBy: {
              position: "asc",
            },
          },
        },
      },
      attachments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!card) {
    return null;
  }

  return {
    id: card.id,
    boardId: card.boardId,
    listId: card.listId,
    title: card.title,
    description: card.description,
    dueDate: card.dueDate?.toISOString() ?? null,
    status: card.status,
    priority: card.priority,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    createdBy: serializeUser(card.createdBy),
    labels: serializeLabels(card.cardLabels),
    assignees: card.assignments.map(({ user }) => serializeUser(user)),
    comments: card.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      author: serializeUser(comment.author),
    })),
    checklists: card.checklists.map((checklist) => ({
      id: checklist.id,
      title: checklist.title,
      position: checklist.position,
      items: checklist.items.map((item) => ({
        id: item.id,
        title: item.title,
        position: item.position,
        isCompleted: item.isCompleted,
        completedAt: item.completedAt?.toISOString() ?? null,
      })),
    })),
    attachments: card.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      url: attachment.url,
      size: attachment.size,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt.toISOString(),
    })),
  };
}
