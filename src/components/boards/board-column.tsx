"use client";

import { useState, useTransition } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteListAction, updateListAction } from "@/app/actions/boards";
import { AddCardForm } from "@/components/boards/add-card-form";
import { BoardCard } from "@/components/boards/board-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { removeListFromBoard, renameListInBoard } from "@/lib/board-local-updates";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import type { BoardListView } from "@/types";

type BoardColumnProps = {
  boardId: string;
  list: BoardListView;
  canEdit: boolean;
  disableInteractions?: boolean;
  onOpenCard: (cardId: string) => void;
};

export function BoardColumn({
  boardId,
  list,
  canEdit,
  disableInteractions = false,
  onOpenCard,
}: BoardColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [isPending, startTransition] = useTransition();
  const mutateBoard = useBoardStore((state) => state.mutateBoard);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `list:${list.id}`,
    data: {
      type: "list",
      list,
    },
    disabled: !canEdit || disableInteractions,
  });

  const cardIds = list.cards.map((card) => `card:${card.id}`);

  function handleRename() {
    startTransition(async () => {
      const result = await updateListAction({
        boardId,
        listId: list.id,
        name,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (!result.data) {
        toast.error("La lista se actualizó, pero no pudimos reflejar el cambio localmente.");
        return;
      }

      const payload = result.data;
      toast.success(result.message ?? "Lista actualizada.");
      setIsEditing(false);
      mutateBoard((board) =>
        renameListInBoard(
          board,
          payload.listId,
          payload.name,
          payload.boardUpdatedAt,
        ),
      );
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteListAction({
        boardId,
        listId: list.id,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (!result.data) {
        toast.error("La lista se eliminó, pero no pudimos reflejar el cambio localmente.");
        return;
      }

      const payload = result.data;
      toast.success(result.message ?? "Lista eliminada.");
      mutateBoard((board) =>
        removeListFromBoard(board, payload.listId, payload.boardUpdatedAt),
      );
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "glass-panel flex w-[min(88vw,320px)] snap-start shrink-0 flex-col rounded-[28px] border border-border p-3.5 sm:p-4",
        isDragging && "opacity-70 shadow-2xl",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="mt-1 rounded-xl p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Arrastrar lista"
            disabled={!canEdit || disableInteractions}
            {...attributes}
            {...listeners}
          >
            <GripHorizontal className="size-4" />
          </button>
          {isEditing ? (
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleRename();
              }}
            >
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-9"
                autoFocus
              />
            </form>
          ) : (
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-semibold">
                {list.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {list.cards.length} tarjetas
              </p>
            </div>
          )}
        </div>

        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setName(list.name);
                  setIsEditing(true);
                }}
              >
                <PencilLine className="size-4" />
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleDelete}
              >
                <Trash2 className="size-4" />
                Eliminar lista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mb-4 flex gap-2">
          <Button size="sm" disabled={isPending} onClick={handleRename}>
            Guardar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setName(list.name);
              setIsEditing(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : null}

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="kanban-scrollbar flex max-h-[60vh] min-h-24 flex-1 flex-col gap-3 overflow-y-auto pr-1 sm:max-h-[70vh]">
          {list.cards.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
              onOpen={() => onOpenCard(card.id)}
              disabled={!canEdit || disableInteractions}
            />
          ))}
          {!list.cards.length ? (
            <div className="rounded-[24px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Sin tarjetas en esta lista.
            </div>
          ) : null}
        </div>
      </SortableContext>

      <div className="mt-4">
        <AddCardForm
          boardId={boardId}
          listId={list.id}
          disabled={!canEdit || disableInteractions}
        />
      </div>
    </div>
  );
}
