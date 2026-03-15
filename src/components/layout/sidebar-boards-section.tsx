"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { RoutePrefetch } from "@/components/layout/route-prefetch";
import { getBoardTheme, getRoleLabel } from "@/lib/utils";
import type { SidebarBoardSummary } from "@/types";

const DESKTOP_MEDIA_QUERY = "(min-width: 1280px)";

type SidebarBoardsResponse = {
  boards?: SidebarBoardSummary[];
};

function SidebarBoardsSkeleton() {
  return (
    <>
      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Tableros activos</p>
          <p className="text-xs text-muted-foreground">
            Cargando accesos recientes...
          </p>
        </div>
        <div className="h-6 w-10 animate-pulse rounded-full bg-secondary" />
      </div>

      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="glass-panel flex items-start gap-3 rounded-[24px] border border-border p-4"
          >
            <div className="mt-1 size-3 rounded-full bg-secondary/80" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-secondary/70" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function SidebarBoardsSection() {
  const [boards, setBoards] = useState<SidebarBoardSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const requestedRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    let activeController: AbortController | null = null;

    const loadBoards = async () => {
      if (!mediaQuery.matches || requestedRef.current) {
        return;
      }

      requestedRef.current = true;
      activeController = new AbortController();
      setStatus("loading");

      try {
        const response = await fetch("/api/sidebar-boards", {
          cache: "no-store",
          signal: activeController.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const payload = (await response.json()) as SidebarBoardsResponse;
        setBoards(payload.boards ?? []);
        setStatus("ready");
      } catch {
        if (activeController.signal.aborted) {
          return;
        }

        requestedRef.current = false;
        setStatus("error");
      }
    };

    void loadBoards();

    const handleChange = () => {
      if (mediaQuery.matches) {
        void loadBoards();
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      activeController?.abort();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  if (status !== "ready") {
    return <SidebarBoardsSkeleton />;
  }

  return (
    <>
      <RoutePrefetch boardIds={boards.map((board) => board.id)} />

      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Tableros activos</p>
          <p className="text-xs text-muted-foreground">
            Acceso rápido a tus proyectos
          </p>
        </div>
        <Badge variant="secondary">{boards.length}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {boards.length ? (
          boards.map((board) => {
            const theme = getBoardTheme(board.theme);

            return (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                prefetch
                className="glass-panel flex items-start gap-3 rounded-[24px] border border-border p-4 transition hover:-translate-y-0.5"
              >
                <div
                  className={`mt-1 size-3 rounded-full bg-gradient-to-r ${theme.gradientClass}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{board.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getRoleLabel(board.role)}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-card/60 px-4 py-5 text-sm text-muted-foreground">
            Tus tableros recientes van a aparecer acá.
          </div>
        )}
      </div>
    </>
  );
}
