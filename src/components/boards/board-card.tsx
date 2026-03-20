"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Paperclip, SquareCheckBig } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { CardDueDatePicker } from "@/components/boards/card-due-date-picker";
import { LABEL_COLOR_STYLES } from "@/lib/constants";
import { cn, getPriorityLabel } from "@/lib/utils";
import type { CardSummaryView } from "@/types";

type BoardCardProps = {
  card: CardSummaryView;
  boardId: string;
  onOpenCard: (cardId: string) => void;
  disabled?: boolean;
};

function BoardCardComponent({
  card,
  boardId,
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
    data: { type: "card", card },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onOpenCard(card.id)}
      className={cn(
        "focus-ring group w-full rounded-2xl border border-border/70 bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_8px_24px_-8px_rgba(11,107,99,0.18)]",
        isDragging && "opacity-50 shadow-2xl rotate-1 scale-[1.02]",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {(card.labels.length > 0 || card.priority) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {card.labels.map((label) => (
            <Badge
              key={label.id}
              className={cn("border-none text-[10px]", LABEL_COLOR_STYLES[label.color].soft)}
            >
              {label.name}
            </Badge>
          ))}
          <Badge variant="secondary" className="text-[10px]">
            {getPriorityLabel(card.priority)}
          </Badge>
        </div>
      )}

      <h4 className="text-sm font-semibold leading-snug text-card-foreground">
        {card.title}
      </h4>
      {card.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {card.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {/* Fecha inline — clickeable para editar */}
        <CardDueDatePicker card={card} boardId={boardId} />

        {card.checklistTotal > 0 && (
          <span className="inline-flex items-center gap-1">
            <SquareCheckBig className="size-3" />
            {card.checklistCompleted}/{card.checklistTotal}
          </span>
        )}
        {card.commentCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" />
            {card.commentCount}
          </span>
        )}
        {card.attachmentCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3" />
            {card.attachmentCount}
          </span>
        )}
      </div>

      {card.assignees.length > 0 ? (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {card.assignees.slice(0, 4).map((assignee) => (
              <UserAvatar
                key={assignee.userId}
                name={assignee.name}
                src={assignee.avatarUrl}
                className="size-6 border-2 border-card"
              />
            ))}
            {card.assignees.length > 4 && (
              <div className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-secondary text-[9px] font-semibold text-muted-foreground">
                +{card.assignees.length - 4}
              </div>
            )}
          </div>
          <span className="flex items-center gap-1 text-[10px] font-medium text-primary opacity-60 transition-opacity duration-150 group-hover:opacity-100">
            <span className="hidden sm:inline">Ver detalle</span>
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </span>
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <span className="flex items-center gap-1 text-[10px] font-medium text-primary opacity-60 transition-opacity duration-150 group-hover:opacity-100">
            <span className="hidden sm:inline">Ver detalle</span>
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </span>
        </div>
      )}
    </button>
  );
}

export const BoardCard = memo(BoardCardComponent);
