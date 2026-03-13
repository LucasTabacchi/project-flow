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

function serializeSearchCard(card: {
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
      color: SearchCardView["labels"][number]["color"];
    };
  }>;
}): SearchCardView {
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
    labels: card.cardLabels.map(({ label }) => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })),
    assignees: card.assignments.map(({ user }) => serializeUser(user)),
    isOverdue: isCardOverdue(card.dueDate, card.status),
  };
}

export async function getDashboardData(
  userId: string,
  email: string,
): Promise<DashboardData> {
  const [boards, invitations, upcomingCards] = await Promise.all([
    prisma.board.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
        lists: {
          select: {
            id: true,
          },
        },
        cards: {
          select: {
            id: true,
            status: true,
            dueDate: true,
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
          gte: startOfDay(new Date()),
          lte: addDays(new Date(), 7),
        },
      },
      include: {
        board: {
          select: {
            name: true,
            theme: true,
          },
        },
        list: {
          select: {
            name: true,
          },
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
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 6,
    }),
  ]);

  const boardSummaries = boards.map((board) => {
    const role =
      board.members.find((member) => member.userId === userId)?.role ?? "VIEWER";
    const completedCards = board.cards.filter((card) => card.status === "DONE").length;
    const overdueCards = board.cards.filter((card) =>
      isCardOverdue(card.dueDate, card.status),
    ).length;

    return {
      id: board.id,
      name: board.name,
      description: board.description,
      theme: board.theme,
      role,
      memberCount: board.members.length,
      listCount: board.lists.length,
      cardCount: board.cards.length,
      completedCards,
      overdueCards,
      updatedAt: board.updatedAt.toISOString(),
    };
  });

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
      ...(filters.priority ? { priority: filters.priority as SearchCardView["priority"] } : {}),
      ...(filters.status ? { status: filters.status as SearchCardView["status"] } : {}),
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
    include: {
      board: {
        select: {
          name: true,
          theme: true,
        },
      },
      list: {
        select: {
          name: true,
        },
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
    include: {
      board: {
        select: {
          name: true,
          theme: true,
        },
      },
      list: {
        select: {
          name: true,
        },
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
  const boards = await prisma.board.findMany({
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
      labels: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      members: {
        select: {
          user: {
            select: userSummarySelect,
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const memberMap = new Map<string, UserSummary>();
  const labelMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string;
    }
  >();

  boards.forEach((board) => {
    board.members.forEach(({ user }) => {
      memberMap.set(user.id, serializeUser(user));
    });

    board.labels.forEach((label) => {
      labelMap.set(label.id, {
        id: label.id,
        name: label.name,
        color: label.color,
      });
    });
  });

  return {
    boards: boards.map((board) => ({
      id: board.id,
      name: board.name,
      theme: board.theme,
    })),
    members: Array.from(memberMap.values()),
    labels: Array.from(labelMap.values()),
  };
}
