import { Prisma } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { isCardOverdue } from "@/lib/utils";
import type {
  DashboardData,
  ProfilePageData,
  SearchCardView,
  UserSummary,
} from "@/types";

type DashboardBoardRow = {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  role: DashboardData["boards"][number]["role"];
  memberCount: number;
  listCount: number;
  cardCount: number;
  completedCards: number;
  overdueCards: number;
  updatedAt: Date;
};

type ProfileStatsRow = {
  boardCount: number;
  assignedCards: number;
  completedCards: number;
  commentCount: number;
};

const getAccessibleBoardDirectory = cache(async (userId: string) => {
  const boards = await prisma.boardMember.findMany({
    where: {
      userId,
    },
    select: {
      boardId: true,
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
  });

  return boards.map((membership) => ({
    id: membership.board.id,
    boardId: membership.boardId,
    name: membership.board.name,
    theme: membership.board.theme,
    role: membership.role,
    updatedAt: membership.board.updatedAt,
  }));
});

const getAccessibleBoardIds = cache(async (userId: string) => {
  const boards = await getAccessibleBoardDirectory(userId);
  return boards.map((board) => board.boardId);
});

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

  const [boards, invitations] = await Promise.all([
    prisma.$queryRaw<DashboardBoardRow[]>(Prisma.sql`
      SELECT
        b.id,
        b.name,
        b.description,
        b.theme,
        bm.role::text AS role,
        b."updatedAt",
        (
          SELECT COUNT(*)::int
          FROM "BoardMember" members
          WHERE members."boardId" = b.id
        ) AS "memberCount",
        (
          SELECT COUNT(*)::int
          FROM "List" lists
          WHERE lists."boardId" = b.id
        ) AS "listCount",
        (
          SELECT COUNT(*)::int
          FROM "Card" cards
          WHERE cards."boardId" = b.id
        ) AS "cardCount",
        (
          SELECT COUNT(*)::int
          FROM "Card" cards
          WHERE cards."boardId" = b.id AND cards.status = 'DONE'
        ) AS "completedCards",
        (
          SELECT COUNT(*)::int
          FROM "Card" cards
          WHERE
            cards."boardId" = b.id
            AND cards.status <> 'DONE'
            AND cards."dueDate" < ${now}
        ) AS "overdueCards"
      FROM "BoardMember" bm
      INNER JOIN "Board" b ON b.id = bm."boardId"
      WHERE bm."userId" = ${userId}
      ORDER BY b."updatedAt" DESC
    `),
    prisma.boardInvitation.findMany({
      where: {
        email,
        status: "PENDING",
        expiresAt: {
          gt: now,
        },
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
  ]);

  const boardIds = boards.map((board) => board.id);
  const upcomingCards = boardIds.length
    ? await prisma.card.findMany({
        where: {
          boardId: {
            in: boardIds,
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
      })
    : [];

  const boardSummaries = boards.map((board) => ({
    id: board.id,
    name: board.name,
    description: board.description,
    theme: board.theme,
    role: board.role,
    memberCount: board.memberCount,
    listCount: board.listCount,
    cardCount: board.cardCount,
    completedCards: board.completedCards,
    overdueCards: board.overdueCards,
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
  const accessibleBoardIds = await getAccessibleBoardIds(userId);
  const filteredBoardIds = filters.boardId
    ? accessibleBoardIds.filter((boardId) => boardId === filters.boardId)
    : accessibleBoardIds;

  if (!filteredBoardIds.length) {
    return [];
  }

  const cards = await prisma.card.findMany({
    where: {
      boardId: {
        in: filteredBoardIds,
      },
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
  const boardIds = await getAccessibleBoardIds(userId);

  if (!boardIds.length) {
    return [];
  }

  const cards = await prisma.card.findMany({
    where: {
      boardId: {
        in: boardIds,
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
  const [user, profileStats] = await Promise.all([
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
    prisma.$queryRaw<ProfileStatsRow[]>(Prisma.sql`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM "BoardMember"
          WHERE "userId" = ${userId}
        ) AS "boardCount",
        (
          SELECT COUNT(*)::int
          FROM "CardAssignment"
          WHERE "userId" = ${userId}
        ) AS "assignedCards",
        (
          SELECT COUNT(*)::int
          FROM "CardAssignment" assignments
          INNER JOIN "Card" cards ON cards.id = assignments."cardId"
          WHERE assignments."userId" = ${userId} AND cards.status = 'DONE'
        ) AS "completedCards",
        (
          SELECT COUNT(*)::int
          FROM "CardComment"
          WHERE "authorId" = ${userId}
        ) AS "commentCount"
    `),
  ]);

  const stats = profileStats[0] ?? {
    boardCount: 0,
    assignedCards: 0,
    completedCards: 0,
    commentCount: 0,
  };

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
      boardCount: stats.boardCount,
      assignedCards: stats.assignedCards,
      completedCards: stats.completedCards,
      commentCount: stats.commentCount,
    },
  };
}

export async function getSearchContext(userId: string) {
  const boardDirectory = await getAccessibleBoardDirectory(userId);
  const boardIds = boardDirectory.map((board) => board.boardId);

  if (!boardIds.length) {
    return {
      boards: [],
      members: [],
      labels: [],
    };
  }

  const [labels, members] = await Promise.all([
    prisma.label.findMany({
      where: {
        boardId: {
          in: boardIds,
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
        boardId: {
          in: boardIds,
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
    boards: boardDirectory.map((board) => ({
      id: board.id,
      name: board.name,
      theme: board.theme,
    })),
    members: members
      .map(({ user }) => serializeUser(user))
      .sort((left, right) => left.name.localeCompare(right.name, "es")),
    labels,
  };
}
