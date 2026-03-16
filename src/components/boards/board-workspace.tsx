"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { reorderListsAction } from "@/app/actions/boards";
import { reorderCardsAction } from "@/app/actions/cards";
import { AddListForm } from "@/components/boards/add-list-form";
import { BoardColumn } from "@/components/boards/board-column";
import { BoardFilters } from "@/components/boards/board-filters";
import { BoardHeader } from "@/components/boards/board-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { isCardOverdue } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import type { BoardListView, BoardPageData, CardSummaryView } from "@/types";

const CardDetailDialog = dynamic(
  () =>
    import("@/components/boards/card-detail-dialog").then((module) => ({
      default: module.CardDetailDialog,
    })),
  {
    loading: () => null,
  },
);

const BoardRealtimeSync = dynamic(
  () =>
    import("@/components/boards/board-realtime-sync").then((module) => ({
      default: module.BoardRealtimeSync,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

type BoardWorkspaceProps = {
  board: BoardPageData;
};

function getEntityId(value: string) {
  return value.split(":")[1] ?? value;
}

function isCardIdentifier(value: string) {
  return value.startsWith("card:");
}

function isListIdentifier(value: string) {
  return value.startsWith("list:");
}

function moveCardBetweenLists(
  lists: BoardListView[],
  activeCardId: string,
  overId: string,
) {
  const activeListIndex = lists.findIndex((list) =>
    list.cards.some((card) => card.id === activeCardId),
  );

  if (activeListIndex < 0) {
    return lists;
  }

  const activeCardIndex = lists[activeListIndex].cards.findIndex(
    (card) => card.id === activeCardId,
  );

  if (activeCardIndex < 0) {
    return lists;
  }

  const activeCard = lists[activeListIndex].cards[activeCardIndex];

  if (isListIdentifier(overId)) {
    const overListId = getEntityId(overId);
    const overListIndex = lists.findIndex((list) => list.id === overListId);

    if (overListIndex < 0) {
      return lists;
    }

    if (
      activeListIndex === overListIndex &&
      activeCardIndex === lists[activeListIndex].cards.length - 1
    ) {
      return lists;
    }

    const nextLists = [...lists];

    if (activeListIndex === overListIndex) {
      nextLists[activeListIndex] = {
        ...lists[activeListIndex],
        cards: arrayMove(
          lists[activeListIndex].cards,
          activeCardIndex,
          lists[activeListIndex].cards.length - 1,
        ),
      };

      return nextLists;
    }

    const sourceCards = [...lists[activeListIndex].cards];
    sourceCards.splice(activeCardIndex, 1);

    nextLists[activeListIndex] = {
      ...lists[activeListIndex],
      cards: sourceCards,
    };
    nextLists[overListIndex] = {
      ...lists[overListIndex],
      cards: [
        ...lists[overListIndex].cards,
        {
          ...activeCard,
          listId: overListId,
        },
      ],
    };

    return nextLists;
  }

  const overCardId = getEntityId(overId);
  const overListIndex = lists.findIndex((list) =>
    list.cards.some((card) => card.id === overCardId),
  );

  if (overListIndex < 0) {
    return lists;
  }

  const overCardIndex = lists[overListIndex].cards.findIndex(
    (card) => card.id === overCardId,
  );

  if (overCardIndex < 0 || activeCardId === overCardId) {
    return lists;
  }

  const nextLists = [...lists];

  if (activeListIndex === overListIndex) {
    nextLists[activeListIndex] = {
      ...lists[activeListIndex],
      cards: arrayMove(lists[activeListIndex].cards, activeCardIndex, overCardIndex),
    };

    return nextLists;
  }

  const sourceCards = [...lists[activeListIndex].cards];
  sourceCards.splice(activeCardIndex, 1);

  const destinationCards = [...lists[overListIndex].cards];
  destinationCards.splice(overCardIndex, 0, {
    ...activeCard,
    listId: lists[overListIndex].id,
  });

  nextLists[activeListIndex] = {
    ...lists[activeListIndex],
    cards: sourceCards,
  };
  nextLists[overListIndex] = {
    ...lists[overListIndex],
    cards: destinationCards,
  };

  return nextLists;
}

export function BoardWorkspace({ board }: BoardWorkspaceProps) {
  const router = useRouter();
  const hydrateBoard = useBoardStore((state) => state.hydrateBoard);
  const boardState = useBoardStore((state) => state.board);
  const setLists = useBoardStore((state) => state.setLists);
  const filters = useBoardStore((state) => state.filters);
  const openCard = useBoardStore((state) => state.openCard);
  const closeCard = useBoardStore((state) => state.closeCard);
  const selectedCardId = useBoardStore((state) => state.selectedCardId);
  const [activeCard, setActiveCard] = useState<CardSummaryView | null>(null);
  const [activeList, setActiveList] = useState<BoardListView | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(filters.query);

  useEffect(() => {
    hydrateBoard(board);
  }, [board, hydrateBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const currentBoard = boardState ?? board;
  const selectedCardUpdatedAt = useMemo(() => {
    if (!selectedCardId) {
      return null;
    }

    for (const list of currentBoard.lists) {
      const card = list.cards.find((item) => item.id === selectedCardId);

      if (card) {
        return card.updatedAt;
      }
    }

    return null;
  }, [currentBoard.lists, selectedCardId]);
  const isFilteredView =
    Boolean(deferredQuery.trim()) ||
    filters.labelId !== "ALL" ||
    filters.assigneeId !== "ALL" ||
    filters.priority !== "ALL" ||
    filters.status !== "ALL" ||
    filters.overdueOnly;

  const visibleLists = useMemo(() => {
    if (!isFilteredView) {
      return currentBoard.lists;
    }

    const query = deferredQuery.trim().toLowerCase();

    return currentBoard.lists
      .map((list) => ({
        ...list,
        cards: list.cards.filter((card) => {
          const matchesQuery =
            !query ||
            card.title.toLowerCase().includes(query) ||
            (card.description ?? "").toLowerCase().includes(query);
          const matchesLabel =
            filters.labelId === "ALL" ||
            card.labels.some((label) => label.id === filters.labelId);
          const matchesAssignee =
            filters.assigneeId === "ALL" ||
            card.assignees.some((assignee) => assignee.userId === filters.assigneeId);
          const matchesPriority =
            filters.priority === "ALL" || card.priority === filters.priority;
          const matchesStatus =
            filters.status === "ALL" || card.status === filters.status;
          const matchesOverdue =
            !filters.overdueOnly || isCardOverdue(card.dueDate, card.status);

          return (
            matchesQuery &&
            matchesLabel &&
            matchesAssignee &&
            matchesPriority &&
            matchesStatus &&
            matchesOverdue
          );
        }),
      }))
      .filter((list) => !isFilteredView || list.cards.length > 0);
  }, [currentBoard.lists, deferredQuery, filters, isFilteredView]);
  const boardHeaderData = useMemo(
    () => ({
      id: currentBoard.id,
      name: currentBoard.name,
      description: currentBoard.description,
      theme: currentBoard.theme,
      role: currentBoard.role,
      permissions: currentBoard.permissions,
      labels: currentBoard.labels,
      members: currentBoard.members,
      presence: currentBoard.presence,
      stats: currentBoard.stats,
    }),
    [
      currentBoard.description,
      currentBoard.id,
      currentBoard.labels,
      currentBoard.members,
      currentBoard.name,
      currentBoard.permissions,
      currentBoard.presence,
      currentBoard.role,
      currentBoard.stats,
      currentBoard.theme,
    ],
  );

  async function persistCardPositions(nextLists: BoardListView[]) {
    const result = await reorderCardsAction({
      boardId: currentBoard.id,
      lists: nextLists.map((list) => ({
        id: list.id,
        cardIds: list.cards.map((card) => card.id),
      })),
    });

    if (!result.ok) {
      toast.error(result.message);
      router.refresh();
      return;
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;

    if (data?.type === "card") {
      setActiveCard(data.card as CardSummaryView);
      return;
    }

    if (data?.type === "list") {
      setActiveList(data.list as BoardListView);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over || !activeCard) {
      return;
    }

    const activeId = getEntityId(String(event.active.id));
    const overId = String(event.over.id);

    if (!isCardIdentifier(String(event.active.id))) {
      return;
    }

    const nextLists = moveCardBetweenLists(currentBoard.lists, activeId, overId);
    if (nextLists === currentBoard.lists) {
      return;
    }

    setLists(nextLists);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveCard(null);
    setActiveList(null);

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (isListIdentifier(activeId) && isListIdentifier(overId) && activeId !== overId) {
      const oldIndex = currentBoard.lists.findIndex(
        (list) => list.id === getEntityId(activeId),
      );
      const newIndex = currentBoard.lists.findIndex(
        (list) => list.id === getEntityId(overId),
      );

      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const nextLists = arrayMove(currentBoard.lists, oldIndex, newIndex);
      setLists(nextLists);

      startTransition(async () => {
        const result = await reorderListsAction({
          boardId: currentBoard.id,
          orderedIds: nextLists.map((list) => list.id),
        });

        if (!result.ok) {
          toast.error(result.message);
          router.refresh();
          return;
        }
      });

      return;
    }

    if (isCardIdentifier(activeId)) {
      startTransition(async () => {
        await persistCardPositions(currentBoard.lists);
      });
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <BoardHeader board={boardHeaderData} />
      <BoardRealtimeSync
        boardId={currentBoard.id}
        updatedAt={currentBoard.updatedAt}
        activeCardId={selectedCardId}
        pauseSync={Boolean(activeCard || activeList || isPending)}
      />
      <BoardFilters labels={currentBoard.labels} members={currentBoard.members} />

      {isFilteredView ? (
        <div className="flex flex-col items-start gap-2 rounded-[24px] border border-dashed border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
          <Badge variant="secondary">Vista filtrada</Badge>
          El drag and drop se pausa mientras hay filtros activos.
        </div>
      ) : null}

      {visibleLists.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentBoard.lists.map((list) => `list:${list.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="kanban-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {visibleLists.map((list) => (
                <BoardColumn
                  key={list.id}
                  boardId={currentBoard.id}
                  list={list}
                  canEdit={currentBoard.permissions.canEdit}
                  disableInteractions={isFilteredView || isPending}
                  onOpenCard={openCard}
                />
              ))}
              <AddListForm
                boardId={currentBoard.id}
                disabled={!currentBoard.permissions.canEdit || isFilteredView || isPending}
              />
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCard ? (
              <div className="glass-panel w-[min(82vw,300px)] rounded-[24px] border border-border p-4 shadow-2xl">
                <p className="font-semibold">{activeCard.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {activeCard.description || "Tarjeta en movimiento"}
                </p>
              </div>
            ) : activeList ? (
              <div className="glass-panel w-[min(82vw,320px)] rounded-[28px] border border-border p-4 shadow-2xl">
                <p className="font-display text-lg font-semibold">{activeList.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activeList.cards.length} tarjetas
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <EmptyState
          title="No hay tarjetas que coincidan"
          description="Probá limpiar filtros o crear nuevas listas y tarjetas."
        />
      )}

      {selectedCardId ? (
        <CardDetailDialog
          boardId={currentBoard.id}
          cardId={selectedCardId}
          cardUpdatedAt={selectedCardUpdatedAt}
          open
          onOpenChange={(open) => {
            if (!open) {
              closeCard();
            }
          }}
          members={currentBoard.members}
          presence={currentBoard.presence}
          labels={currentBoard.labels}
          canEdit={currentBoard.permissions.canEdit}
        />
      ) : null}
    </div>
  );
}
