import { addDays, startOfDay } from "date-fns";

import { prisma } from "@/lib/db";
import { isCardOverdue } from "@/lib/utils";
import type {
  DashboardData,
  ProfilePageData,
  SearchCardView,
  UserSummary,
} from "@/types";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

type SearchCardRecord = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: SearchCardView["status"];
  priority: SearchCardView["priority"];
  boardId: string;
  board: {
    name: string;
    theme: string;
  };
  listId: string;
  list: {
    name: string;
  };
  assignments?: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
  }>;
  cardLabels?: Array<{
    label: {
      id: string;
      name: string;
      color: SearchCardView["labels"][number]["color"];
    };
  }>;
};

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

function serializeSearchCard(card: SearchCardRecord): SearchCardView {
  return {
    id: card.id,
    boardId: card.boardId,
    boardName: card.board.name,
    boardTheme: card.board.theme,
    listId: card.listId,
    listName: card.list.name,
    title: card.title,
    description: card.description,
    dueDate: card.dueDate?.toISOString() ?? null,
    status: card.status,
    priority: card.priority,
    labels: (card.cardLabels ?? []).map(({ label }) => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })),
    assignees: (card.assignments ?? []).map(({ user }) => serializeUser(user)),
    isOverdue: isCardOverdue(card.dueDate, card.status),
  };
}

export async function getDashboardData(
  userId: string,
  email: string,
): Promise<DashboardData> {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  const now = new Date();

  const [boards, invitations, completedCounts, overdueCounts, upcomingCards] =
    await Promise.all([
      prisma.board.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          theme: true,
          updatedAt: true,
          members: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
            take: 1,
          },
          _count: {
            select: {
              members: true,
              lists: true,
              cards: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.boardInvitation.findMany({
        where: {
          email,
          status: "PENDING",
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
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.card.groupBy({
        by: ["boardId"],
        where: {
          board: {
            members: {
              some: {
                userId,
              },
            },
          },
          status: "DONE",
        },
        _count: {
          _all: true,
        },
      }),
      prisma.card.groupBy({
        by: ["boardId"],
        where: {
          board: {
            members: {
              some: {
                userId,
              },
            },
          },
          dueDate: {
            lt: now,
          },
          status: {
            not: "DONE",
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.card.findMany({
        where: {
          board: {
            members: {
              some: {
                userId,
              },
            },
          },
          dueDate: {
            gte: today,
            lte: nextWeek,
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          status: true,
          priority: true,
          boardId: true,
          board: {
            select: {
              name: true,
              theme: true,
            },
          },
          listId: true,
          list: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: 6,
      }),
    ]);

  const completedByBoard = new Map(
    completedCounts.map((item) => [item.boardId, item._count._all]),
  );
  const overdueByBoard = new Map(
    overdueCounts.map((item) => [item.boardId, item._count._all]),
  );

  const boardSummaries = boards.map((board) => ({
    id: board.id,
    name: board.name,
    description: board.description,
    theme: board.theme,
    role: board.members[0]?.role ?? "VIEWER",
    memberCount: board._count.members,
    listCount: board._count.lists,
    cardCount: board._count.cards,
    completedCards: completedByBoard.get(board.id) ?? 0,
    overdueCards: overdueByBoard.get(board.id) ?? 0,
    updatedAt: board.updatedAt.toISOString(),
  }));

  return {
    boards: boardSummaries,
    pendingInvitations: invitations.map((invitation) => ({
      id: invitation.id,
      boardId: invitation.board.id,
      boardName: invitation.board.name,
      boardTheme: invitation.board.theme,
      role: invitation.role,
      invitedByName: invitation.invitedBy.name,
      expiresAt: invitation.expiresAt.toISOString(),
    })),
    upcomingCards: upcomingCards.map(serializeSearchCard),
    stats: {
      boardCount: boardSummaries.length,
      totalCards: boardSummaries.reduce((sum, board) => sum + board.cardCount, 0),
      completedCards: boardSummaries.reduce(
        (sum, board) => sum + board.completedCards,
        0,
      ),
      overdueCards: boardSummaries.reduce(
        (sum, board) => sum + board.overdueCards,
        0,
      ),
      dueSoonCards: upcomingCards.length,
    },
  };
}

type SearchFilters = {
  query?: string;
  labelId?: string;
  priority?: string;
  assigneeId?: string;
  status?: string;
  boardId?: string;
  onlyOverdue?: boolean;
};

export async function getSearchCards(userId: string, filters: SearchFilters) {
  const cards = await prisma.card.findMany({
    where: {
      board: {
        members: {
          some: {
            userId,
          },
        },
      },
      ...(filters.boardId ? { boardId: filters.boardId } : {}),
      ...(filters.priority
        ? { priority: filters.priority as SearchCardView["priority"] }
        : {}),
      ...(filters.status
        ? { status: filters.status as SearchCardView["status"] }
        : {}),
      ...(filters.assigneeId
        ? {
            assignments: {
              some: {
                userId: filters.assigneeId,
              },
            },
          }
        : {}),
      ...(filters.labelId
        ? {
            cardLabels: {
              some: {
                labelId: filters.labelId,
              },
            },
          }
        : {}),
      ...(filters.query
        ? {
            OR: [
              {
                title: {
                  contains: filters.query,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: filters.query,
                  mode: "insensitive",
                },
              },
              {
                board: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      status: true,
      priority: true,
      boardId: true,
      board: {
        select: {
          name: true,
          theme: true,
        },
      },
      listId: true,
      list: {
        select: {
          name: true,
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
    },
    orderBy: [
      {
        dueDate: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
    take: 80,
  });

  const serialized = cards.map(serializeSearchCard);

  return filters.onlyOverdue
    ? serialized.filter((card) => card.isOverdue)
    : serialized;
}

export async function getCalendarCards(userId: string) {
  const cards = await prisma.card.findMany({
    where: {
      board: {
        members: {
          some: {
            userId,
          },
        },
      },
      dueDate: {
        not: null,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      status: true,
      priority: true,
      boardId: true,
      board: {
        select: {
          name: true,
          theme: true,
        },
      },
      listId: true,
      list: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return cards.map(serializeSearchCard);
}

export async function getProfilePageData(userId: string): Promise<ProfilePageData> {
  const [user, boardCount, assignedCards, completedCards, commentCount] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
        },
      }),
      prisma.boardMember.count({
        where: {
          userId,
        },
      }),
      prisma.cardAssignment.count({
        where: {
          userId,
        },
      }),
      prisma.cardAssignment.count({
        where: {
          userId,
          card: {
            status: "DONE",
          },
        },
      }),
      prisma.cardComment.count({
        where: {
          authorId: userId,
        },
      }),
    ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt.toISOString(),
    },
    stats: {
      boardCount,
      assignedCards,
      completedCards,
      commentCount,
    },
  };
}

export async function getSearchContext(userId: string) {
  const [boards, labels, members] = await Promise.all([
    prisma.board.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        theme: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.label.findMany({
      where: {
        board: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.boardMember.findMany({
      where: {
        board: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      distinct: ["userId"],
      select: {
        user: {
          select: userSummarySelect,
        },
      },
    }),
  ]);

  return {
    boards,
    members: members
      .map(({ user }) => serializeUser(user))
      .sort((left, right) => left.name.localeCompare(right.name, "es")),
    labels,
  };
}
