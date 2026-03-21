import { isCardOverdue } from "@/lib/utils";
import type {
  BoardCustomFieldView,
  BoardListView,
  BoardPageData,
  BoardStats,
  CardDetailView,
  CardSummaryView,
  LabelView,
} from "@/types";

function buildBoardStats(board: BoardPageData): BoardStats {
  const cards = board.lists.flatMap((list) => list.cards);

  return {
    totalCards: cards.length,
    completedCards: cards.filter((card) => card.status === "DONE").length,
    overdueCards: cards.filter((card) => isCardOverdue(card.dueDate, card.status))
      .length,
    inProgressCards: cards.filter((card) => card.status === "IN_PROGRESS").length,
    byUser: board.members.map((member) => ({
      userId: member.userId,
      name: member.name,
      count: cards.filter((card) =>
        card.assignees.some((assignee) => assignee.userId === member.userId),
      ).length,
    })),
  };
}

function withUpdatedBoard(
  board: BoardPageData,
  updatedAt: string | undefined,
  nextLists: BoardListView[],
  overrides?: Partial<BoardPageData>,
): BoardPageData {
  const nextBoard: BoardPageData = {
    ...board,
    ...overrides,
    lists: nextLists,
    updatedAt: updatedAt ?? board.updatedAt,
    stats: board.stats,
  };

  return {
    ...nextBoard,
    stats: buildBoardStats(nextBoard),
  };
}

export function summarizeCardDetail(detail: CardDetailView): CardSummaryView {
  const checklistItems = detail.checklists.flatMap((checklist) => checklist.items);

  return {
    id: detail.id,
    listId: detail.listId,
    title: detail.title,
    description: detail.description,
    dueDate: detail.dueDate,
    status: detail.status,
    priority: detail.priority,
    labels: detail.labels,
    assignees: detail.assignees,
    commentCount: detail.comments.length,
    attachmentCount: detail.attachments.length,
    checklistCompleted: checklistItems.filter((item) => item.isCompleted).length,
    checklistTotal: checklistItems.length,
    updatedAt: detail.updatedAt,
    estimatedMinutes: detail.estimatedMinutes,
    trackedMinutes: detail.trackedMinutes,
    customFields: detail.customFields,
  };
}

export function appendCardToBoard(
  board: BoardPageData,
  listId: string,
  card: CardSummaryView,
  updatedAt?: string,
): BoardPageData {
  return withUpdatedBoard(
    board,
    updatedAt,
    board.lists.map((list) =>
      list.id === listId
        ? {
            ...list,
            cards: [...list.cards, card],
          }
        : list,
    ),
  );
}

export function replaceCardInBoard(
  board: BoardPageData,
  detail: CardDetailView,
  updatedAt?: string,
): BoardPageData {
  const nextCard = summarizeCardDetail(detail);

  return withUpdatedBoard(
    board,
    updatedAt,
    board.lists.map((list) =>
      list.id === detail.listId
        ? {
            ...list,
            cards: list.cards.map((card) => (card.id === detail.id ? nextCard : card)),
          }
        : {
            ...list,
            cards: list.cards.filter((card) => card.id !== detail.id),
          },
    ),
  );
}

export function removeCardFromBoard(
  board: BoardPageData,
  cardId: string,
  updatedAt?: string,
): BoardPageData {
  return withUpdatedBoard(
    board,
    updatedAt,
    board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => card.id !== cardId),
    })),
  );
}

export function appendListToBoard(
  board: BoardPageData,
  list: BoardListView,
  updatedAt?: string,
): BoardPageData {
  return withUpdatedBoard(
    board,
    updatedAt,
    [...board.lists, list].sort((left, right) => left.position - right.position),
  );
}

export function renameListInBoard(
  board: BoardPageData,
  listId: string,
  name: string,
  updatedAt?: string,
): BoardPageData {
  return withUpdatedBoard(
    board,
    updatedAt,
    board.lists.map((list) =>
      list.id === listId
        ? {
            ...list,
            name,
          }
        : list,
    ),
  );
}

export function removeListFromBoard(
  board: BoardPageData,
  listId: string,
  updatedAt?: string,
): BoardPageData {
  return withUpdatedBoard(
    board,
    updatedAt,
    board.lists.filter((list) => list.id !== listId),
  );
}

export function appendLabelToBoard(
  board: BoardPageData,
  label: LabelView,
  updatedAt?: string,
): BoardPageData {
  return withUpdatedBoard(board, updatedAt, board.lists, {
    labels: [...board.labels, label].sort((left, right) =>
      left.name.localeCompare(right.name, "es"),
    ),
  });
}

export function updateBoardMetadata(
  board: BoardPageData,
  nextValues: {
    name: string;
    description: string;
    theme: string;
    updatedAt?: string;
  },
): BoardPageData {
  return withUpdatedBoard(board, nextValues.updatedAt, board.lists, {
    name: nextValues.name,
    description: nextValues.description,
    theme: nextValues.theme,
  });
}

export function updateBoardTimestamp(
  board: BoardPageData,
  updatedAt?: string,
): BoardPageData {
  if (!updatedAt) {
    return board;
  }

  return {
    ...board,
    updatedAt,
  };
}

export function updateBoardCustomFields(
  board: BoardPageData,
  customFields: BoardCustomFieldView[],
  updatedAt?: string,
): BoardPageData {
  return withUpdatedBoard(board, updatedAt, board.lists, {
    customFields: [...customFields].sort((left, right) => left.position - right.position),
  });
}
