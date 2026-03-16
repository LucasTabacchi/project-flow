import { getBoardPresence } from "@/lib/board-realtime";
import { Prisma } from "@prisma/client";

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
  comments?: Array<{ id: string }>;
  attachments?: Array<{ id: string }>;
  checklists?: Array<{
    items: Array<{
      isCompleted: boolean;
    }>;
  }>;
  _count?: {
    comments: number;
    attachments: number;
  };
  checklistCompleted?: number;
  checklistTotal?: number;
}): CardSummaryView {
  const checklistItems = card.checklists?.flatMap((checklist) => checklist.items) ?? [];
  const checklistCompleted =
    card.checklistCompleted ??
    checklistItems.filter((item) => item.isCompleted).length;
  const checklistTotal = card.checklistTotal ?? checklistItems.length;

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
    commentCount: card._count?.comments ?? card.comments?.length ?? 0,
    attachmentCount: card._count?.attachments ?? card.attachments?.length ?? 0,
    checklistCompleted,
    checklistTotal,
    updatedAt: card.updatedAt.toISOString(),
  };
}

type ChecklistStatsRow = {
  cardId: string;
  checklistCompleted: number;
  checklistTotal: number;
};

function toChecklistStatsMap(rows: ChecklistStatsRow[]) {
  return new Map(
    rows.map((row) => [
      row.cardId,
      {
        checklistCompleted: row.checklistCompleted,
        checklistTotal: row.checklistTotal,
      },
    ]),
  );
}

async function getBoardChecklistStats(boardId: string) {
  const rows = await prisma.$queryRaw<ChecklistStatsRow[]>(Prisma.sql`
    SELECT
      card.id AS "cardId",
      COUNT(item.id) FILTER (WHERE item."isCompleted")::int AS "checklistCompleted",
      COUNT(item.id)::int AS "checklistTotal"
    FROM "Card" card
    LEFT JOIN "CardChecklist" checklist ON checklist."cardId" = card.id
    LEFT JOIN "ChecklistItem" item ON item."checklistId" = checklist.id
    WHERE card."boardId" = ${boardId}
    GROUP BY card.id
  `);

  return toChecklistStatsMap(rows);
}

export async function getBoardCardSummary(
  boardId: string,
  cardId: string,
): Promise<CardSummaryView | null> {
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      boardId,
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
  });

  if (!card) {
    return null;
  }

  return serializeCardSummary(card);
}

function buildStats(
  members: BoardMemberView[],
  lists: Array<{
    cards: CardSummaryView[];
  }>,
) {
  const cardsByUser = new Map(members.map((member) => [member.userId, 0]));
  let totalCards = 0;
  let completedCards = 0;
  let overdueCards = 0;
  let inProgressCards = 0;

  for (const list of lists) {
    for (const card of list.cards) {
      totalCards += 1;

      if (card.status === "DONE") {
        completedCards += 1;
      }

      if (card.status === "IN_PROGRESS") {
        inProgressCards += 1;
      }

      if (isCardOverdue(card.dueDate, card.status)) {
        overdueCards += 1;
      }

      const seenAssignees = new Set<string>();

      for (const assignee of card.assignees) {
        if (seenAssignees.has(assignee.userId)) {
          continue;
        }

        seenAssignees.add(assignee.userId);
        cardsByUser.set(
          assignee.userId,
          (cardsByUser.get(assignee.userId) ?? 0) + 1,
        );
      }
    }
  }

  return {
    totalCards,
    completedCards,
    overdueCards,
    inProgressCards,
    byUser: members.map((member) => ({
      userId: member.userId,
      name: member.name,
      count: cardsByUser.get(member.userId) ?? 0,
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
          select: {
            id: true,
            name: true,
            description: true,
            theme: true,
            backgroundColor: true,
            updatedAt: true,
            labels: {
              orderBy: {
                name: "asc",
              },
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            members: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                role: true,
                user: {
                  select: userSummarySelect,
                },
              },
            },
            lists: {
              orderBy: {
                position: "asc",
              },
              select: {
                id: true,
                name: true,
                position: true,
                cards: {
                  orderBy: {
                    position: "asc",
                  },
                  select: {
                    id: true,
                    listId: true,
                    title: true,
                    description: true,
                    dueDate: true,
                    status: true,
                    priority: true,
                    updatedAt: true,
                    assignments: {
                      select: {
                        user: {
                          select: userSummarySelect,
                        },
                      },
                    },
                    cardLabels: {
                      select: {
                        label: {
                          select: {
                            id: true,
                            name: true,
                            color: true,
                          },
                        },
                      },
                    },
                    _count: {
                      select: {
                        comments: true,
                        attachments: true,
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
  const checklistStatsByCardId = await getBoardChecklistStats(board.id);
  const members: BoardMemberView[] = board.members.map((member) => ({
    ...serializeUser(member.user),
    role: member.role as BoardRole,
  }));

  const lists = board.lists.map((list) => ({
    id: list.id,
    name: list.name,
    position: list.position,
    cards: list.cards.map((card) => {
      const checklistStats = checklistStatsByCardId.get(card.id);

      return serializeCardSummary({
        ...card,
        checklistCompleted: checklistStats?.checklistCompleted ?? 0,
        checklistTotal: checklistStats?.checklistTotal ?? 0,
      });
    }),
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
    invitations: [],
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
