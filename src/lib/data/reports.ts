import { Prisma } from "@prisma/client";
import { cache } from "react";

import { prisma } from "@/lib/db";
import type {
  TimeReportBoardSummary,
  TimeReportCardDeviationView,
  TimeReportMemberSummary,
  TimeReportsBoardOption,
  TimeReportsData,
  UserSummary,
} from "@/types";

type AccessibleBoardRecord = {
  id: string;
  name: string;
  theme: string;
  updatedAt: Date;
};

type OverviewCardRow = {
  totalCards: number;
  cardsWithEstimate: number;
  cardsWithoutEstimate: number;
  totalEstimatedMinutes: number;
  totalTrackedMinutes: number;
  overBudgetCards: number;
};

type OverviewEntryRow = {
  timeEntryCount: number;
  activeMembers: number;
};

type BoardSummaryRow = {
  boardId: string;
  boardName: string;
  boardTheme: string;
  totalEstimatedMinutes: number;
  totalTrackedMinutes: number;
  cardCount: number;
  cardsWithEstimate: number;
  overBudgetCards: number;
  timeEntryCount: number;
  activeMembers: number;
  lastLoggedAt: Date | null;
};

type MemberSummaryRow = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalTrackedMinutes: number;
  timeEntryCount: number;
  cardsWorkedCount: number;
  boardCount: number;
  lastLoggedAt: Date | null;
};

type DeviationCardRow = {
  cardId: string;
  boardId: string;
  boardName: string;
  boardTheme: string;
  listId: string;
  listName: string;
  title: string;
  status: TimeReportCardDeviationView["status"];
  priority: TimeReportCardDeviationView["priority"];
  estimatedMinutes: number;
  trackedMinutes: number;
  updatedAt: Date;
};

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

const getAccessibleBoards = cache(async (userId: string): Promise<AccessibleBoardRecord[]> => {
  const memberships = await prisma.boardMember.findMany({
    where: {
      userId,
    },
    select: {
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

  return memberships.map((membership) => membership.board);
});

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

function buildVariancePercentage(trackedMinutes: number, estimatedMinutes: number) {
  if (!estimatedMinutes) {
    return null;
  }

  return Math.round(((trackedMinutes - estimatedMinutes) / estimatedMinutes) * 100);
}

function buildScopedBoards(
  boards: AccessibleBoardRecord[],
  requestedBoardId?: string,
) {
  const selectedBoard =
    requestedBoardId?.trim()
      ? boards.find((board) => board.id === requestedBoardId.trim()) ?? null
      : null;

  return {
    selectedBoard,
    scopedBoards: selectedBoard ? [selectedBoard] : boards,
  };
}

export async function getTimeReportsData(
  userId: string,
  requestedBoardId?: string,
): Promise<TimeReportsData> {
  const boards = await getAccessibleBoards(userId);
  const { selectedBoard, scopedBoards } = buildScopedBoards(boards, requestedBoardId);

  const boardOptions: TimeReportsBoardOption[] = boards.map((board) => ({
    id: board.id,
    name: board.name,
    theme: board.theme,
  }));

  if (!scopedBoards.length) {
    return {
      boards: boardOptions,
      selectedBoardId: null,
      selectedBoardName: null,
      overview: {
        totalCards: 0,
        cardsWithEstimate: 0,
        cardsWithoutEstimate: 0,
        totalEstimatedMinutes: 0,
        totalTrackedMinutes: 0,
        varianceMinutes: 0,
        variancePercentage: null,
        overBudgetCards: 0,
        timeEntryCount: 0,
        activeMembers: 0,
      },
      byBoard: [],
      byMember: [],
      topVarianceCards: [],
    };
  }

  const scopedBoardIds = scopedBoards.map((board) => board.id);
  const boardIdsSql = Prisma.join(scopedBoardIds);

  const [
    overviewCardsRows,
    overviewEntriesRows,
    boardRows,
    memberRows,
    deviationRows,
  ] = await Promise.all([
    prisma.$queryRaw<OverviewCardRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalCards",
        COUNT(*) FILTER (WHERE c."estimatedMinutes" IS NOT NULL)::int AS "cardsWithEstimate",
        COUNT(*) FILTER (WHERE c."estimatedMinutes" IS NULL)::int AS "cardsWithoutEstimate",
        COALESCE(SUM(c."estimatedMinutes"), 0)::int AS "totalEstimatedMinutes",
        COALESCE(SUM(c."trackedMinutes"), 0)::int AS "totalTrackedMinutes",
        COUNT(*) FILTER (
          WHERE c."estimatedMinutes" IS NOT NULL AND c."trackedMinutes" > c."estimatedMinutes"
        )::int AS "overBudgetCards"
      FROM "Card" c
      WHERE c."boardId" IN (${boardIdsSql})
    `),
    prisma.$queryRaw<OverviewEntryRow[]>(Prisma.sql`
      SELECT
        COUNT(te.id)::int AS "timeEntryCount",
        COUNT(DISTINCT te."userId")::int AS "activeMembers"
      FROM "TimeEntry" te
      INNER JOIN "Card" c ON c.id = te."cardId"
      WHERE c."boardId" IN (${boardIdsSql})
    `),
    prisma.$queryRaw<BoardSummaryRow[]>(Prisma.sql`
      SELECT
        b.id AS "boardId",
        b.name AS "boardName",
        b.theme AS "boardTheme",
        (
          SELECT COALESCE(SUM(c."estimatedMinutes"), 0)::int
          FROM "Card" c
          WHERE c."boardId" = b.id
        ) AS "totalEstimatedMinutes",
        (
          SELECT COALESCE(SUM(c."trackedMinutes"), 0)::int
          FROM "Card" c
          WHERE c."boardId" = b.id
        ) AS "totalTrackedMinutes",
        (
          SELECT COUNT(*)::int
          FROM "Card" c
          WHERE c."boardId" = b.id
        ) AS "cardCount",
        (
          SELECT COUNT(*)::int
          FROM "Card" c
          WHERE c."boardId" = b.id AND c."estimatedMinutes" IS NOT NULL
        ) AS "cardsWithEstimate",
        (
          SELECT COUNT(*)::int
          FROM "Card" c
          WHERE
            c."boardId" = b.id
            AND c."estimatedMinutes" IS NOT NULL
            AND c."trackedMinutes" > c."estimatedMinutes"
        ) AS "overBudgetCards",
        (
          SELECT COUNT(te.id)::int
          FROM "TimeEntry" te
          INNER JOIN "Card" c ON c.id = te."cardId"
          WHERE c."boardId" = b.id
        ) AS "timeEntryCount",
        (
          SELECT COUNT(DISTINCT te."userId")::int
          FROM "TimeEntry" te
          INNER JOIN "Card" c ON c.id = te."cardId"
          WHERE c."boardId" = b.id
        ) AS "activeMembers",
        (
          SELECT MAX(te."createdAt")
          FROM "TimeEntry" te
          INNER JOIN "Card" c ON c.id = te."cardId"
          WHERE c."boardId" = b.id
        ) AS "lastLoggedAt"
      FROM "Board" b
      WHERE b.id IN (${boardIdsSql})
      ORDER BY "totalTrackedMinutes" DESC, "boardName" ASC
    `),
    prisma.$queryRaw<MemberSummaryRow[]>(Prisma.sql`
      SELECT
        u.id AS "userId",
        u.name,
        u.email,
        u."avatarUrl",
        COALESCE(SUM(te.minutes), 0)::int AS "totalTrackedMinutes",
        COUNT(te.id)::int AS "timeEntryCount",
        COUNT(DISTINCT te."cardId")::int AS "cardsWorkedCount",
        COUNT(DISTINCT c."boardId")::int AS "boardCount",
        MAX(te."createdAt") AS "lastLoggedAt"
      FROM "TimeEntry" te
      INNER JOIN "Card" c ON c.id = te."cardId"
      INNER JOIN "User" u ON u.id = te."userId"
      WHERE c."boardId" IN (${boardIdsSql})
      GROUP BY u.id, u.name, u.email, u."avatarUrl"
      ORDER BY "totalTrackedMinutes" DESC, u.name ASC
      LIMIT 12
    `),
    prisma.$queryRaw<DeviationCardRow[]>(Prisma.sql`
      SELECT
        c.id AS "cardId",
        c."boardId",
        b.name AS "boardName",
        b.theme AS "boardTheme",
        c."listId",
        l.name AS "listName",
        c.title,
        c.status::text AS status,
        c.priority::text AS priority,
        c."estimatedMinutes"::int AS "estimatedMinutes",
        c."trackedMinutes"::int AS "trackedMinutes",
        c."updatedAt"
      FROM "Card" c
      INNER JOIN "Board" b ON b.id = c."boardId"
      INNER JOIN "List" l ON l.id = c."listId"
      WHERE
        c."boardId" IN (${boardIdsSql})
        AND c."estimatedMinutes" IS NOT NULL
        AND c."trackedMinutes" > 0
      ORDER BY ABS(c."trackedMinutes" - c."estimatedMinutes") DESC, c."trackedMinutes" DESC, c."updatedAt" DESC
      LIMIT 10
    `),
  ]);

  const deviationCardIds = deviationRows.map((card) => card.cardId);
  const deviationAssignees = deviationCardIds.length
    ? await prisma.cardAssignment.findMany({
        where: {
          cardId: {
            in: deviationCardIds,
          },
        },
        select: {
          cardId: true,
          user: {
            select: userSummarySelect,
          },
        },
      })
    : [];

  const assigneesByCard = new Map<string, UserSummary[]>();
  for (const assignment of deviationAssignees) {
    const current = assigneesByCard.get(assignment.cardId) ?? [];
    current.push(serializeUser(assignment.user));
    assigneesByCard.set(assignment.cardId, current);
  }

  const overviewCards = overviewCardsRows[0] ?? {
    totalCards: 0,
    cardsWithEstimate: 0,
    cardsWithoutEstimate: 0,
    totalEstimatedMinutes: 0,
    totalTrackedMinutes: 0,
    overBudgetCards: 0,
  };
  const overviewEntries = overviewEntriesRows[0] ?? {
    timeEntryCount: 0,
    activeMembers: 0,
  };
  const overviewVarianceMinutes =
    overviewCards.totalTrackedMinutes - overviewCards.totalEstimatedMinutes;

  return {
    boards: boardOptions,
    selectedBoardId: selectedBoard?.id ?? null,
    selectedBoardName: selectedBoard?.name ?? null,
    overview: {
      totalCards: overviewCards.totalCards,
      cardsWithEstimate: overviewCards.cardsWithEstimate,
      cardsWithoutEstimate: overviewCards.cardsWithoutEstimate,
      totalEstimatedMinutes: overviewCards.totalEstimatedMinutes,
      totalTrackedMinutes: overviewCards.totalTrackedMinutes,
      varianceMinutes: overviewVarianceMinutes,
      variancePercentage: buildVariancePercentage(
        overviewCards.totalTrackedMinutes,
        overviewCards.totalEstimatedMinutes,
      ),
      overBudgetCards: overviewCards.overBudgetCards,
      timeEntryCount: overviewEntries.timeEntryCount,
      activeMembers: overviewEntries.activeMembers,
    },
    byBoard: boardRows.map((board): TimeReportBoardSummary => ({
      boardId: board.boardId,
      boardName: board.boardName,
      boardTheme: board.boardTheme,
      totalEstimatedMinutes: board.totalEstimatedMinutes,
      totalTrackedMinutes: board.totalTrackedMinutes,
      varianceMinutes: board.totalTrackedMinutes - board.totalEstimatedMinutes,
      variancePercentage: buildVariancePercentage(
        board.totalTrackedMinutes,
        board.totalEstimatedMinutes,
      ),
      cardCount: board.cardCount,
      cardsWithEstimate: board.cardsWithEstimate,
      overBudgetCards: board.overBudgetCards,
      timeEntryCount: board.timeEntryCount,
      activeMembers: board.activeMembers,
      lastLoggedAt: board.lastLoggedAt?.toISOString() ?? null,
    })),
    byMember: memberRows.map((member): TimeReportMemberSummary => ({
      userId: member.userId,
      name: member.name,
      email: member.email,
      avatarUrl: member.avatarUrl,
      totalTrackedMinutes: member.totalTrackedMinutes,
      timeEntryCount: member.timeEntryCount,
      cardsWorkedCount: member.cardsWorkedCount,
      boardCount: member.boardCount,
      lastLoggedAt: member.lastLoggedAt?.toISOString() ?? null,
    })),
    topVarianceCards: deviationRows.map((card): TimeReportCardDeviationView => ({
      cardId: card.cardId,
      boardId: card.boardId,
      boardName: card.boardName,
      boardTheme: card.boardTheme,
      listId: card.listId,
      listName: card.listName,
      title: card.title,
      status: card.status,
      priority: card.priority,
      estimatedMinutes: card.estimatedMinutes,
      trackedMinutes: card.trackedMinutes,
      varianceMinutes: card.trackedMinutes - card.estimatedMinutes,
      variancePercentage:
        buildVariancePercentage(card.trackedMinutes, card.estimatedMinutes) ?? 0,
      updatedAt: card.updatedAt.toISOString(),
      assignees: assigneesByCard.get(card.cardId) ?? [],
    })),
  };
}
