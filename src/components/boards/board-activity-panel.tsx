"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  MessageSquare,
  MousePointerClick,
  Plus,
  UserPlus,
  X,
} from "lucide-react";

import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActivityItem = {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
};

type BoardActivityPanelProps = {
  boardId: string;
  open: boolean;
  onClose: () => void;
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  CARD_CREATED: Plus,
  CARD_MOVED: ArrowRight,
  CARD_RENAMED: MousePointerClick,
  CARD_STATUS_CHANGED: Activity,
  CARD_ASSIGNED: UserPlus,
  CARD_COMMENT_ADDED: MessageSquare,
  CARD_DUE_DATE_SET: CalendarClock,
  CARD_DUE_DATE_REMOVED: CalendarClock,
  LIST_CREATED: Plus,
  LIST_RENAMED: MousePointerClick,
  MEMBER_JOINED: UserPlus,
};

const ACTIVITY_COLORS: Record<string, string> = {
  CARD_CREATED: "bg-primary/10 text-primary",
  CARD_MOVED: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  CARD_STATUS_CHANGED: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  CARD_ASSIGNED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CARD_COMMENT_ADDED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  CARD_DUE_DATE_SET: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  CARD_DUE_DATE_REMOVED: "bg-secondary text-muted-foreground",
};

export function BoardActivityPanel({ boardId, open, onClose }: BoardActivityPanelProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/boards/${boardId}/activity`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: { activity: ActivityItem[] }) => {
        setActivity(data.activity ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [boardId, open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="font-semibold">Actividad del tablero</h2>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-8 shrink-0 animate-pulse rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-secondary/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                <Activity className="size-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Sin actividad aún</p>
              <p className="text-sm text-muted-foreground/70">
                Las acciones del equipo aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="relative p-5">
              {/* Línea vertical del timeline */}
              <div className="absolute left-[2.35rem] top-5 bottom-5 w-px bg-border/60" />

              <div className="space-y-5">
                {activity.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
                  const colorClass = ACTIVITY_COLORS[item.type] ?? "bg-secondary text-muted-foreground";

                  return (
                    <div key={item.id} className="relative flex gap-3">
                      {/* Ícono del evento */}
                      <div
                        className={cn(
                          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                          colorClass,
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>

                      {/* Contenido */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start gap-1.5">
                          <UserAvatar
                            name={item.user.name}
                            src={item.user.avatarUrl}
                            className="size-5 shrink-0 mt-0.5"
                          />
                          <p className="text-sm leading-snug">
                            <span className="font-semibold">{item.user.name}</span>{" "}
                            <span className="text-muted-foreground">{item.summary}</span>
                          </p>
                        </div>
                        <p className="mt-1 pl-6 text-[11px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
