"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Paperclip, MessageSquare, UserPlus, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  CARD_ASSIGNED: UserPlus,
  CARD_COMMENT: MessageSquare,
  BOARD_INVITATION: Paperclip,
  INVITATION_ACCEPTED: ThumbsUp,
  INVITATION_DECLINED: ThumbsDown,
};

const TYPE_COLOR: Record<string, string> = {
  CARD_ASSIGNED: "bg-primary/10 text-primary",
  CARD_COMMENT: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  BOARD_INVITATION: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  INVITATION_ACCEPTED: "bg-success-surface text-success-foreground",
  INVITATION_DECLINED: "bg-destructive/10 text-destructive",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent fail
    }
  }, []);

  // Poll cada 60s para el badge de conteo (sin SSE)
  useEffect(() => {
    void fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  // Al abrir: cargar fresh y marcar como leídas
  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) return;

    setLoading(true);
    await fetchNotifications();
    setLoading(false);

    if (unreadCount > 0) {
      // Marcar todas como leídas
      void fetch("/api/notifications", {
        method: "PATCH",
        credentials: "same-origin",
      }).then(() => {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      });
    }
  }

  function handleClick(notification: Notification) {
    setOpen(false);
    if (notification.href) {
      router.push(notification.href);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        collisionPadding={{ left: 16, right: 16 }}
        className="w-[min(92vw,22rem)] p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold">Notificaciones</p>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={async () => {
                await fetch("/api/notifications", { method: "PATCH", credentials: "same-origin" });
                setUnreadCount(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="size-3" />
              Marcar todas leídas
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-xl p-3">
                  <div className="size-8 shrink-0 animate-pulse rounded-xl bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-full animate-pulse rounded bg-secondary/70" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-secondary/50" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Bell className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Sin notificaciones</p>
              <p className="text-xs text-muted-foreground/70">
                Te avisaremos cuando haya actividad en tus tableros.
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {notifications.map((notification) => {
                const Icon = ICON_MAP[notification.type] ?? Bell;
                const iconClass = TYPE_COLOR[notification.type] ?? "bg-secondary text-muted-foreground";

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleClick(notification)}
                    className={cn(
                      "group w-full flex items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-secondary/60",
                      !notification.read && "bg-primary/[0.04]",
                    )}
                  >
                    {/* Punto de no leído */}
                    <div className="relative mt-0.5 shrink-0">
                      <div className={cn("flex size-8 items-center justify-center rounded-xl", iconClass)}>
                        <Icon className="size-3.5" />
                      </div>
                      {!notification.read && (
                        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm leading-snug", !notification.read ? "font-semibold" : "font-medium")}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
