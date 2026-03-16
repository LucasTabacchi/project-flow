"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, MessageSquare, Paperclip, SquareCheckBig } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { LABEL_COLOR_STYLES } from "@/lib/constants";
import { cn, formatDueDate, getPriorityLabel, isCardOverdue } from "@/lib/utils";
import type { CardSummaryView } from "@/types";

type BoardCardProps = {
  card: CardSummaryView;
  onOpenCard: (cardId: string) => void;
  disabled?: boolean;
};

function BoardCardComponent({
  card,
  onOpenCard,
  disabled = false,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${card.id}`,
    data: {
      type: "card",
      card,
    },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onOpenCard(card.id)}
      className={cn(
        "focus-ring glass-panel w-full rounded-[24px] border border-border p-4 text-left transition hover:-translate-y-0.5",
        isDragging && "opacity-60 shadow-2xl",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {card.labels.map((label) => (
          <Badge
            key={label.id}
            className={cn("border-none", LABEL_COLOR_STYLES[label.color].soft)}
          >
            {label.name}
          </Badge>
        ))}
        <Badge variant="secondary">{getPriorityLabel(card.priority)}</Badge>
      </div>

      <h4 className="font-medium leading-snug">{card.title}</h4>
      {card.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {card.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            isCardOverdue(card.dueDate, card.status) && "font-semibold text-amber-600 dark:text-amber-300",
          )}
        >
          <CalendarClock className="size-3.5" />
          {formatDueDate(card.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <SquareCheckBig className="size-3.5" />
          {card.checklistCompleted}/{card.checklistTotal}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare className="size-3.5" />
          {card.commentCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Paperclip className="size-3.5" />
          {card.attachmentCount}
        </span>
      </div>

      {card.assignees.length ? (
        <div className="mt-4 flex items-center justify-end">
          <div className="flex -space-x-2">
            {card.assignees.slice(0, 4).map((assignee) => (
              <UserAvatar
                key={assignee.userId}
                name={assignee.name}
                src={assignee.avatarUrl}
                className="size-8 border-2 border-background"
              />
            ))}
          </div>
        </div>
      ) : null}
    </button>
  );
}

export const BoardCard = memo(BoardCardComponent);
