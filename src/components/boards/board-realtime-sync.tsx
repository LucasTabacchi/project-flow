"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  BoardSnapshotRequestError,
  fetchBoardSnapshot,
} from "@/lib/board-snapshot-client";
import { BOARD_PRESENCE_HEARTBEAT_MS } from "@/lib/realtime-constants";
import { useBoardStore } from "@/stores/board-store";
import type { BoardPresenceView } from "@/types";

type BoardRealtimeSyncProps = {
  boardId: string;
  updatedAt: string;
  activeCardId: string | null;
  activeField?: string | null;
  pauseSync?: boolean;
};

function getPresenceClientId() {
  const storageKey = "projectflow_presence_client_id";
  const existingValue = window.sessionStorage.getItem(storageKey);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = window.crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, nextValue);
  return nextValue;
}

// Backoff exponencial: 1s → 2s → 4s → 8s → 16s → 30s (cap)
// Evita el thundering herd cuando muchos clientes reconectan a la vez
// después de una interrupción.
function getBackoffDelay(attempt: number): number {
  const base = 1000;
  const cap = 30000;
  // Jitter aleatorio ±20% para desincronizar clientes concurrentes
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.min(base * Math.pow(2, attempt) * jitter, cap);
}

export function BoardRealtimeSync({
  boardId,
  updatedAt,
  activeCardId,
  activeField = null,
  pauseSync = false,
}: BoardRealtimeSyncProps) {
  const router = useRouter();
  const hydrateBoard = useBoardStore((state) => state.hydrateBoard);
  const setPresence = useBoardStore((state) => state.setPresence);
  const [isConnected, setIsConnected] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const lastKnownUpdatedAtRef = useRef(updatedAt);
  const pendingUpdatedAtRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const syncErrorShownRef = useRef(false);
  // Track reconnect attempts for backoff
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastKnownUpdatedAtRef.current = updatedAt;
  }, [updatedAt]);

  useEffect(() => {
    setClientId(getPresenceClientId());
  }, []);

  const syncBoardSnapshot = useEffectEvent(async () => {
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;

    try {
      const nextBoard = await fetchBoardSnapshot(boardId);
      hydrateBoard(nextBoard);
      lastKnownUpdatedAtRef.current = nextBoard.updatedAt;
      syncErrorShownRef.current = false;
    } catch (error) {
      if (
        error instanceof BoardSnapshotRequestError &&
        [401, 403, 404].includes(error.status)
      ) {
        router.refresh();
        return;
      }

      if (!syncErrorShownRef.current) {
        toast.error("No pudimos sincronizar el tablero en vivo.");
        syncErrorShownRef.current = true;
      }
    } finally {
      syncInFlightRef.current = false;

      if (
        !pauseSync &&
        pendingUpdatedAtRef.current &&
        pendingUpdatedAtRef.current !== lastKnownUpdatedAtRef.current
      ) {
        pendingUpdatedAtRef.current = null;
        void syncBoardSnapshot();
      }
    }
  });

  const queueOrSyncUpdate = useEffectEvent((nextUpdatedAt: string) => {
    if (nextUpdatedAt === lastKnownUpdatedAtRef.current) {
      return;
    }

    if (pauseSync) {
      pendingUpdatedAtRef.current = nextUpdatedAt;
      return;
    }

    pendingUpdatedAtRef.current = null;
    void syncBoardSnapshot();
  });

  const updatePresence = useEffectEvent(async (nextPresence: BoardPresenceView[]) => {
    setPresence(nextPresence);
  });

  const sendPresenceHeartbeat = useEffectEvent(async (nextActiveCardId: string | null, nextActiveField: string | null = null) => {
    if (!clientId) {
      return;
    }

    try {
      await fetch(`/api/boards/${boardId}/presence`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          activeCardId: nextActiveCardId,
          activeField: nextActiveField,
        }),
      });
    } catch {
      // Presence falls back automatically when the heartbeat expires.
    }
  });

  const removePresence = useEffectEvent(() => {
    if (!clientId) {
      return;
    }

    void fetch(`/api/boards/${boardId}/presence`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
      }),
      keepalive: true,
    }).catch(() => undefined);
  });

  useEffect(() => {
    if (
      pauseSync ||
      !pendingUpdatedAtRef.current ||
      pendingUpdatedAtRef.current === lastKnownUpdatedAtRef.current
    ) {
      return;
    }

    pendingUpdatedAtRef.current = null;
    void syncBoardSnapshot();
  }, [pauseSync, updatedAt]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    void sendPresenceHeartbeat(activeCardId, activeField);

    const intervalId = window.setInterval(() => {
      void sendPresenceHeartbeat(activeCardId, activeField);
    }, BOARD_PRESENCE_HEARTBEAT_MS);

    const handlePageHide = () => {
      removePresence();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", handlePageHide);
      removePresence();
    };
  }, [activeCardId, activeField, boardId, clientId]);

  // SSE connection con backoff exponencial en reconexión
  useEffect(() => {
    let closed = false;

    function connect() {
      if (closed) return;

      const stream = new EventSource(
        `/api/boards/${boardId}/events?since=${encodeURIComponent(
          lastKnownUpdatedAtRef.current,
        )}`,
      );

      stream.onopen = () => {
        // Conexión exitosa — resetear contador de intentos
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
      };

      stream.addEventListener("connected", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          updatedAt: string;
          presence: BoardPresenceView[];
        };

        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        void updatePresence(payload.presence);
      });

      stream.addEventListener("board-updated", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          updatedAt: string;
        };

        setIsConnected(true);
        queueOrSyncUpdate(payload.updatedAt);
      });

      stream.addEventListener("presence-updated", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          presence: BoardPresenceView[];
        };

        setIsConnected(true);
        void updatePresence(payload.presence);
      });

      stream.addEventListener("board-removed", () => {
        closed = true;
        stream.close();
        router.refresh();
      });

      stream.onerror = () => {
        if (closed) return;

        stream.close();
        setIsConnected(false);

        // Calcular delay con backoff exponencial + jitter
        const attempt = reconnectAttemptsRef.current;
        const delay = getBackoffDelay(attempt);
        reconnectAttemptsRef.current = attempt + 1;

        reconnectTimerRef.current = setTimeout(() => {
          if (!closed) connect();
        }, delay);
      };

      return stream;
    }

    connect();

    return () => {
      closed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [boardId, router]);

  if (isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
      <span className="size-2 animate-pulse rounded-full bg-amber-500" />
      Reconectando sincronización en vivo...
    </div>
  );
}
