import { Prisma } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { isCardOverdue } from "@/lib/utils";
import type {
  CalendarCardView,
  DashboardData,
  ProfilePageData,
  SearchCardView,
  SearchContextData,
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

type SearchContextRow = {
  boards: SearchContextData["boards"] | null;
  labels: SearchContextData["labels"] | null;
  members: SearchContextData["members"] | null;
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

type CalendarCardRecord = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: CalendarCardView["status"];
  priority: CalendarCardView["priority"];
  boardId: string;
  board: {
    name: string;
    theme: string;
  };
  listId: string;
  list: {
    name: string;
  };
};

type SearchCardIdRow = {
  id: string;
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

function serializeCalendarCard(card: CalendarCardRecord): CalendarCardView {
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
    isOverdue: isCardOverdue(card.dueDate, card.status),
  };
}

function orderCardsByIds<T extends { id: string }>(rows: T[], orderedIds: string[]) {
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  return orderedIds
    .map((id) => rowsById.get(id))
    .filter((row): row is T => Boolean(row));
}

export async function getDashboardData(
  userId: string,
  email: string,
): Promise<DashboardData> {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  const now = new Date();

  // ─── MEJORA 2: upcomingCards en paralelo con boards e invitations ─────────
  // Antes: boards+invitations en Promise.all, luego upcomingCards esperando
  // boardIds → secuencial = mínimo 2 roundtrips en serie.
  // Ahora: las 3 queries corren en paralelo usando un subquery JOIN en lugar
  // de esperar el array de boardIds. Ahorra el tiempo de la query más lenta
  // del primer grupo.
  const [boards, invitations, upcomingCards] = await Promise.all([
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
    // Usamos un subquery JOIN en lugar de esperar boardIds del primer grupo
    prisma.card.findMany({
      where: {
        board: {
          members: {
            some: { userId },
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

  const normalizedQuery = filters.query?.trim();
  let orderedCardIds: string[] | null = null;

  if (normalizedQuery) {
    const queryPattern = `%${normalizedQuery}%`;
    const conditions = [
      Prisma.sql`c."boardId" IN (${Prisma.join(filteredBoardIds)})`,
    ];

    if (filters.priority) {
      conditions.push(
        Prisma.sql`c.priority = CAST(${filters.priority} AS "CardPriority")`,
      );
    }

    if (filters.status) {
      conditions.push(
        Prisma.sql`c.status = CAST(${filters.status} AS "CardStatus")`,
      );
    }

    if (filters.assigneeId) {
      conditions.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM "CardAssignment" assignments
          WHERE assignments."cardId" = c.id
            AND assignments."userId" = ${filters.assigneeId}
        )
      `);
    }

    if (filters.labelId) {
      conditions.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM "CardLabel" card_labels
          WHERE card_labels."cardId" = c.id
            AND card_labels."labelId" = ${filters.labelId}
        )
      `);
    }

    const searchVector = Prisma.sql`
      setweight(to_tsvector('simple', coalesce(c.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(c.description, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(b.name, '')), 'C')
    `;
    const searchQuery = Prisma.sql`websearch_to_tsquery('simple', ${normalizedQuery})`;
    const rankedCards = await prisma.$queryRaw<SearchCardIdRow[]>(Prisma.sql`
      WITH ranked_cards AS (
        SELECT
          c.id,
          ts_rank_cd(${searchVector}, ${searchQuery}) AS rank,
          (
            CASE WHEN c.title ILIKE ${queryPattern} THEN 4 ELSE 0 END +
            CASE WHEN c.description ILIKE ${queryPattern} THEN 2 ELSE 0 END +
            CASE WHEN b.name ILIKE ${queryPattern} THEN 1 ELSE 0 END
          ) AS boost,
          c."updatedAt"
        FROM "Card" c
        INNER JOIN "Board" b ON b.id = c."boardId"
        WHERE ${Prisma.join(conditions, " AND ")}
          AND (
            ${searchVector} @@ ${searchQuery}
            OR c.title ILIKE ${queryPattern}
            OR c.description ILIKE ${queryPattern}
            OR b.name ILIKE ${queryPattern}
          )
      )
      SELECT id
      FROM ranked_cards
      ORDER BY boost DESC, rank DESC, "updatedAt" DESC
      LIMIT 80
    `);

    orderedCardIds = rankedCards.map((row) => row.id);
  }

  const cards = await prisma.card.findMany({
    where: {
      ...(orderedCardIds
        ? {
            id: {
              in: orderedCardIds,
            },
          }
        : {
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
          }),
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
    orderBy: orderedCardIds
      ? undefined
      : [
          {
            dueDate: "asc",
          },
          {
            updatedAt: "desc",
          },
        ],
    take: 80,
  });

  const orderedCards = orderedCardIds
    ? orderCardsByIds(cards, orderedCardIds)
    : cards;
  const serialized = orderedCards.map(serializeSearchCard);

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

  return cards.map(serializeCalendarCard);
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

export async function getSearchContext(userId: string): Promise<SearchContextData> {
  const [context] = await prisma.$queryRaw<SearchContextRow[]>(Prisma.sql`
    WITH accessible_boards AS (
      SELECT
        b.id,
        b.name,
        b.theme,
        b."updatedAt"
      FROM "BoardMember" bm
      INNER JOIN "Board" b ON b.id = bm."boardId"
      WHERE bm."userId" = ${userId}
    ),
    boards_json AS (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', board.id,
            'name', board.name,
            'theme', board.theme
          )
          ORDER BY board."updatedAt" DESC
        ),
        '[]'::json
      ) AS boards
      FROM accessible_boards board
    ),
    labels_json AS (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', label.id,
            'name', label.name,
            'color', label.color
          )
          ORDER BY label.name ASC
        ),
        '[]'::json
      ) AS labels
      FROM "Label" label
      WHERE label."boardId" IN (SELECT id FROM accessible_boards)
    ),
    members_json AS (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'userId', member.id,
            'name', member.name,
            'email', member.email,
            'avatarUrl', member."avatarUrl"
          )
          ORDER BY member.name ASC
        ),
        '[]'::json
      ) AS members
      FROM (
        SELECT DISTINCT user_record.id, user_record.name, user_record.email, user_record."avatarUrl"
        FROM "BoardMember" bm
        INNER JOIN "User" user_record ON user_record.id = bm."userId"
        WHERE bm."boardId" IN (SELECT id FROM accessible_boards)
      ) member
    )
    SELECT
      boards_json.boards,
      labels_json.labels,
      members_json.members
    FROM boards_json
    CROSS JOIN labels_json
    CROSS JOIN members_json
  `);

  return {
    boards: context?.boards ?? [],
    labels: context?.labels ?? [],
    members: context?.members ?? [],
  };
}
