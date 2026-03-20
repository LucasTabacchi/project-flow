"use client";

import { useState, useTransition } from "react";
import { CalendarClock, X } from "lucide-react";
import { toast } from "sonner";

import { updateCardAction } from "@/app/actions/cards";
import { cn, formatDueDate, isCardOverdue } from "@/lib/utils";
import { replaceCardInBoard } from "@/lib/board-local-updates";
import { useBoardStore } from "@/stores/board-store";
import type { CardSummaryView } from "@/types";

type CardDueDatePickerProps = {
  card: CardSummaryView;
  boardId: string;
};

export function CardDueDatePicker({ card, boardId }: CardDueDatePickerProps) {
  const mutateBoard = useBoardStore((s) => s.mutateBoard);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOverdue = isCardOverdue(card.dueDate, card.status);

  function stopProp(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen((v) => !v);
  }

  async function saveDueDate(newDate: string | null) {
    startTransition(async () => {
      const result = await updateCardAction({
        boardId,
        cardId: card.id,
        title: card.title,
        description: card.description ?? "",
        dueDate: newDate,
        priority: card.priority,
        status: card.status,
        labelIds: card.labels.map((l) => l.id),
        assigneeIds: card.assignees.map((a) => a.userId),
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (result.data) {
        mutateBoard((board) =>
          replaceCardInBoard(board, result.data!.detail, result.data!.boardUpdatedAt),
        );
      }

      setOpen(false);
    });
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    void saveDueDate(e.target.value || null);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    void saveDueDate(null);
  }

  const dateValue = card.dueDate
    ? new Date(card.dueDate).toISOString().split("T")[0]
    : "";

  return (
    <span className="relative" onClick={stopProp}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs transition hover:bg-secondary",
          isOverdue
            ? "font-semibold text-amber-600 dark:text-amber-400"
            : "text-muted-foreground",
          isPending && "opacity-50",
        )}
      >
        <CalendarClock className="size-3 shrink-0" />
        {formatDueDate(card.dueDate)}
      </button>

      {open && (
        <span
          className="absolute left-0 top-full z-50 mt-1 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-2.5 py-2 shadow-lg"
          onClick={stopProp}
        >
          <input
            type="date"
            defaultValue={dateValue}
            onChange={handleDateChange}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {card.dueDate && (
            <button
              type="button"
              onClick={handleClear}
              className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive"
              title="Quitar fecha"
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      )}
    </span>
  );
}
