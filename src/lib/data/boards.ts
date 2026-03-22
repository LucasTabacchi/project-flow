import { getBoardPresence } from "@/lib/board-realtime";
import { Prisma } from "@prisma/client";
import { cache } from "react";
import {
  isRedisConfigured,
  redisCacheBoardSnapshot,
  redisGetBoardSnapshot,
} from "@/lib/redis";

import { prisma } from "@/lib/db";
import {
  serializeBoardCustomField,
  serializeCardCustomFieldValue,
} from "@/lib/custom-fields";
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
  CardDependencyView,
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

function serializeCardDependency(input: {
  dependencyId: string;
  card: {
    id: string;
    listId: string;
    title: string;
    dueDate: Date | null;
    status: CardDependencyView["status"];
    priority: CardDependencyView["priority"];
    list: {
      name: string;
    };
  };
}): CardDependencyView {
  return {
    dependencyId: input.dependencyId,
    cardId: input.card.id,
    listId: input.card.listId,
    listName: input.card.list.name,
    title: input.card.title,
    dueDate: input.card.dueDate?.toISOString() ?? null,
    status: input.card.status,
    priority: input.card.priority,
  };
}

function normalizeBoardSnapshot(board: BoardPageData): BoardPageData {
  return {
    ...board,
    customFields: board.customFields ?? [],
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        customFields: card.customFields ?? [],
      })),
    })),
  };
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
  estimatedMinutes: number | null;
  trackedMinutes: number;
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
  customFieldValues?: Array<{
    field: {
      id: string;
      name: string;
      type: CardSummaryView["customFields"][number]["type"];
      options: string[];
      position: number;
    };
    textValue: string | null;
    numberValue: number | null;
    optionValue: string | null;
  }>;
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
    estimatedMinutes: card.estimatedMinutes,
    trackedMinutes: card.trackedMinutes,
    customFields: (card.customFieldValues ?? [])
      .sort((left, right) => left.field.position - right.field.position)
      .map((value) => serializeCardCustomFieldValue(value)),
  };
}

// ─── MEJORA 1: Checklist stats fusionado en una sola query SQL ──────────────
// Antes: getBoardPageData hacía 2 roundtrips (membership+presence en paralelo,
// luego getBoardChecklistStats por separado = 3 roundtrips total).
// Ahora: todo en 2 roundtrips (membership+presence en paralelo, checklist
// stats incluido via LEFT JOIN dentro del mismo SELECT de cards).
type BoardCardWithChecklistRow = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: CardSummaryView["status"];
  priority: CardSummaryView["priority"];
  updatedAt: Date;
  estimatedMinutes: number | null;
  trackedMinutes: number;
  checklistCompleted: number;
  checklistTotal: number;
};

type BoardCardAssignmentRow = {
  cardId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type BoardCardLabelRow = {
  cardId: string;
  labelId: string;
  labelName: string;
  labelColor: LabelView["color"];
};

type BoardCardCountRow = {
  cardId: string;
  commentCount: number;
  attachmentCount: number;
};

async function getBoardCardsWithStats(boardId: string) {
  const [cards, assignments, labels, counts, customFieldValues] = await Promise.all([
    prisma.$queryRaw<BoardCardWithChecklistRow[]>(Prisma.sql`
      SELECT
        c.id,
        c."listId",
        c.title,
        c.description,
        c."dueDate",
        c.status::text AS status,
        c.priority::text AS priority,
        c."updatedAt",
        c."estimatedMinutes",
        c."trackedMinutes",
        COUNT(ci.id) FILTER (WHERE ci."isCompleted")::int AS "checklistCompleted",
        COUNT(ci.id)::int AS "checklistTotal"
      FROM "Card" c
      LEFT JOIN "CardChecklist" cc ON cc."cardId" = c.id
      LEFT JOIN "ChecklistItem" ci ON ci."checklistId" = cc.id
      WHERE c."boardId" = ${boardId}
      GROUP BY c.id
      ORDER BY c.position ASC
    `),
    prisma.$queryRaw<BoardCardAssignmentRow[]>(Prisma.sql`
      SELECT
        ca."cardId",
        u.id AS "userId",
        u.name,
        u.email,
        u."avatarUrl"
      FROM "CardAssignment" ca
      INNER JOIN "User" u ON u.id = ca."userId"
      WHERE ca."cardId" IN (
        SELECT id FROM "Card" WHERE "boardId" = ${boardId}
      )
    `),
    prisma.$queryRaw<BoardCardLabelRow[]>(Prisma.sql`
      SELECT
        cl."cardId",
        l.id AS "labelId",
        l.name AS "labelName",
        l.color::text AS "labelColor"
      FROM "CardLabel" cl
      INNER JOIN "Label" l ON l.id = cl."labelId"
      WHERE cl."cardId" IN (
        SELECT id FROM "Card" WHERE "boardId" = ${boardId}
      )
    `),
    prisma.$queryRaw<BoardCardCountRow[]>(Prisma.sql`
      SELECT
        c.id AS "cardId",
        COUNT(DISTINCT cm.id)::int AS "commentCount",
        COUNT(DISTINCT att.id)::int AS "attachmentCount"
      FROM "Card" c
      LEFT JOIN "CardComment" cm ON cm."cardId" = c.id
      LEFT JOIN "Attachment" att ON att."cardId" = c.id
      WHERE c."boardId" = ${boardId}
      GROUP BY c.id
    `),
    prisma.cardCustomFieldValue.findMany({
      where: {
        card: {
          boardId,
        },
      },
      select: {
        cardId: true,
        textValue: true,
        numberValue: true,
        optionValue: true,
        field: {
          select: {
            id: true,
            name: true,
            type: true,
            options: true,
            position: true,
          },
        },
      },
    }),
  ]);

  // Build lookup maps for O(1) assembly
  const assignmentsByCard = new Map<string, BoardCardAssignmentRow[]>();
  for (const row of assignments) {
    const list = assignmentsByCard.get(row.cardId) ?? [];
    list.push(row);
    assignmentsByCard.set(row.cardId, list);
  }

  const labelsByCard = new Map<string, BoardCardLabelRow[]>();
  for (const row of labels) {
    const list = labelsByCard.get(row.cardId) ?? [];
    list.push(row);
    labelsByCard.set(row.cardId, list);
  }

  const countsByCard = new Map(counts.map((r) => [r.cardId, r]));
  const customFieldsByCard = new Map<string, typeof customFieldValues>();

  for (const row of customFieldValues) {
    const list = customFieldsByCard.get(row.cardId) ?? [];
    list.push(row);
    customFieldsByCard.set(row.cardId, list);
  }

  return cards.map((card) => {
    const cardAssignments = assignmentsByCard.get(card.id) ?? [];
    const cardLabels = labelsByCard.get(card.id) ?? [];
    const cardCounts = countsByCard.get(card.id);
    const cardCustomFields = customFieldsByCard.get(card.id) ?? [];

    return serializeCardSummary({
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      dueDate: card.dueDate,
      status: card.status,
      priority: card.priority,
      updatedAt: card.updatedAt,
      estimatedMinutes: card.estimatedMinutes,
      trackedMinutes: card.trackedMinutes,
      checklistCompleted: card.checklistCompleted,
      checklistTotal: card.checklistTotal,
      assignments: cardAssignments.map((a) => ({
        user: { id: a.userId, name: a.name, email: a.email, avatarUrl: a.avatarUrl },
      })),
      cardLabels: cardLabels.map((l) => ({
        label: { id: l.labelId, name: l.labelName, color: l.labelColor },
      })),
      _count: {
        comments: cardCounts?.commentCount ?? 0,
        attachments: cardCounts?.attachmentCount ?? 0,
      },
      customFieldValues: cardCustomFields,
    });
  });
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
      customFieldValues: {
        select: {
          textValue: true,
          numberValue: true,
          optionValue: true,
          field: {
            select: {
              id: true,
              name: true,
              type: true,
              options: true,
              position: true,
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

// ─── MEJORA 3: getUserSidebarBoards con React.cache ──────────────────────────
// Antes: hacía una query Prisma independiente aunque el mismo request del
// dashboard ya traía los tableros del usuario. Con cache() React deduplica
// la llamada dentro del mismo request si se llama con el mismo userId.
export const getUserSidebarBoards = cache(async (
  userId: string,
): Promise<SidebarBoardSummary[]> => {
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
    });

  return boards.map((item) => ({
    id: item.board.id,
    name: item.board.name,
    theme: item.board.theme,
    role: item.role as BoardRole,
    updatedAt: item.board.updatedAt.toISOString(),
  }));
});

export async function getBoardPageData(
  boardId: string,
  userId: string,
): Promise<BoardPageData | null> {
  // ── Ronda 3: intentar leer desde caché Redis ──────────────────────────────
  // La caché se invalida en touchBoard (cada mutación la limpia).
  // Solo cacheamos si Redis está configurado — en dev funciona sin él.
  if (isRedisConfigured()) {
    const cacheKey = `board_page:${boardId}:${userId}`;
    const cached = await redisGetBoardSnapshot<BoardPageData>(cacheKey);
    if (cached) return normalizeBoardSnapshot(cached);
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Arrancamos todo el trabajo independiente juntos para bajar el TTFB.
  const membershipPromise = prisma.boardMember.findUnique({
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
          customFields: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              name: true,
              type: true,
              options: true,
              position: true,
            },
          },
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
            },
          },
        },
      },
    },
  });
  const presencePromise = getBoardPresence(boardId);
  const cardsPromise = getBoardCardsWithStats(boardId);
  const [membership, presence, allCards] = await Promise.all([
    membershipPromise,
    presencePromise,
    cardsPromise,
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

  // Group cards by listId
  const cardsByList = new Map<string, CardSummaryView[]>();
  for (const card of allCards) {
    const list = cardsByList.get(card.listId) ?? [];
    list.push(card);
    cardsByList.set(card.listId, list);
  }

  const lists = board.lists.map((list) => ({
    id: list.id,
    name: list.name,
    position: list.position,
    cards: cardsByList.get(list.id) ?? [],
  }));

  const result: BoardPageData = {
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
    customFields: board.customFields.map((field) => serializeBoardCustomField(field)),
    members,
    presence,
    invitations: [],
    stats: buildStats(members, lists),
    lists,
    updatedAt: board.updatedAt.toISOString(),
  };

  // ── Ronda 3: escribir en caché Redis ─────────────────────────────────────
  if (isRedisConfigured()) {
    const cacheKey = `board_page:${boardId}:${userId}`;
    void redisCacheBoardSnapshot(cacheKey, result).catch(() => {});
  }
  // ─────────────────────────────────────────────────────────────────────────

  return normalizeBoardSnapshot(result);
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
      board: {
        select: {
          customFields: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              name: true,
              type: true,
              options: true,
              position: true,
            },
          },
        },
      },
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
          reactions: {
            select: {
              emoji: true,
              userId: true,
              user: { select: { name: true } },
            },
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
      blocking: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          blockedCard: {
            select: {
              id: true,
              listId: true,
              title: true,
              dueDate: true,
              status: true,
              priority: true,
              list: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      blockedBy: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          blockerCard: {
            select: {
              id: true,
              listId: true,
              title: true,
              dueDate: true,
              status: true,
              priority: true,
              list: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      // ── Ronda 1: time entries ──────────────────────────────────────────────
      timeEntries: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: userSummarySelect },
        },
      },
      customFieldValues: {
        select: {
          fieldId: true,
          textValue: true,
          numberValue: true,
          optionValue: true,
          field: {
            select: {
              id: true,
              name: true,
              type: true,
              options: true,
              position: true,
            },
          },
        },
      },
      // ───────────────────────────────────────────────────────────────────────
    },
  });

  if (!card) {
    return null;
  }

  const customFieldValuesByFieldId = new Map(
    card.customFieldValues.map((value) => [value.fieldId, value]),
  );

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
    comments: card.comments.map((comment) => {
      // Group reactions by emoji
      const reactionMap = new Map<string, { count: number; userNames: string[]; userIds: string[] }>();
      for (const r of comment.reactions ?? []) {
        const entry = reactionMap.get(r.emoji) ?? { count: 0, userNames: [], userIds: [] };
        entry.count++;
        entry.userNames.push(r.user.name);
        entry.userIds.push(r.userId);
        reactionMap.set(r.emoji, entry);
      }
      return {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: serializeUser(comment.author),
        reactions: [...reactionMap.entries()].map(([emoji, data]) => ({
          emoji,
          count: data.count,
          reactedByMe: false, // populated client-side via getCommentReactions or passed userId
          userNames: data.userNames,
        })),
      };
    }),
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
    blocking: card.blocking.map((dependency) =>
      serializeCardDependency({
        dependencyId: dependency.id,
        card: dependency.blockedCard,
      }),
    ),
    blockedBy: card.blockedBy.map((dependency) =>
      serializeCardDependency({
        dependencyId: dependency.id,
        card: dependency.blockerCard,
      }),
    ),
    // ── Ronda 1 ────────────────────────────────────────────────────────────
    estimatedMinutes: card.estimatedMinutes,
    trackedMinutes: card.trackedMinutes,
    timeEntries: card.timeEntries.map((entry) => ({
      id: entry.id,
      minutes: entry.minutes ?? 0,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
      user: serializeUser(entry.user),
    })),
    customFields: card.board.customFields.map((field) => {
      const value = customFieldValuesByFieldId.get(field.id);

      return serializeCardCustomFieldValue({
        field,
        textValue: value?.textValue ?? null,
        numberValue: value?.numberValue ?? null,
        optionValue: value?.optionValue ?? null,
      });
    }),
    // ───────────────────────────────────────────────────────────────────────
  };
}
