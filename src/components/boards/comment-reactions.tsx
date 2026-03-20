"use client";

import { useState, useTransition } from "react";
import { SmilePlus } from "lucide-react";
import { toast } from "sonner";

import {
  ALLOWED_EMOJIS,
  toggleReactionAction,
  type ReactionSummary,
} from "@/app/actions/reactions";
import { cn } from "@/lib/utils";

type CommentReactionsProps = {
  boardId: string;
  commentId: string;
  reactions: ReactionSummary[];
  onUpdate: (reactions: ReactionSummary[]) => void;
  canReact?: boolean;
};

export function CommentReactions({
  boardId,
  commentId,
  reactions,
  onUpdate,
  canReact = true,
}: CommentReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle(emoji: string) {
    setShowPicker(false);
    startTransition(async () => {
      const result = await toggleReactionAction({ boardId, commentId, emoji });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.data) {
        onUpdate(result.data.reactions);
      }
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {/* Existing reactions */}
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          disabled={isPending || !canReact}
          onClick={() => handleToggle(r.emoji)}
          title={r.userNames.join(", ")}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition",
            r.reactedByMe
              ? "border-primary/40 bg-primary/10 font-semibold text-primary"
              : "border-border bg-card/70 text-muted-foreground hover:border-primary/30 hover:bg-primary/5",
            isPending && "opacity-50",
          )}
        >
          <span>{r.emoji}</span>
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {canReact && (
        <div className="relative">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-border bg-card/70 px-2 py-0.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <SmilePlus className="size-3" />
          </button>

          {showPicker && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPicker(false)}
              />
              {/* Picker */}
              <div className="absolute bottom-full left-0 z-50 mb-1 flex gap-1 rounded-2xl border border-border bg-popover p-2 shadow-lg">
                {ALLOWED_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggle(emoji)}
                    className="rounded-lg p-1.5 text-base transition hover:bg-primary/10 hover:scale-110"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
