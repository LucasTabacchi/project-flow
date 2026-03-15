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

export function BoardRealtimeSync({
  boardId,
  updatedAt,
  activeCardId,
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

  const sendPresenceHeartbeat = useEffectEvent(async (nextActiveCardId: string | null) => {
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

    void sendPresenceHeartbeat(activeCardId);

    const intervalId = window.setInterval(() => {
      void sendPresenceHeartbeat(activeCardId);
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
  }, [activeCardId, boardId, clientId]);

  useEffect(() => {
    const stream = new EventSource(
      `/api/boards/${boardId}/events?since=${encodeURIComponent(
        lastKnownUpdatedAtRef.current,
      )}`,
    );

    stream.onopen = () => {
      setIsConnected(true);
    };

    stream.addEventListener("connected", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as {
        updatedAt: string;
        presence: BoardPresenceView[];
      };

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
      stream.close();
      router.refresh();
    });

    stream.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      stream.close();
    };
  }, [boardId, router]);

  if (isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
      <span className="size-2 rounded-full bg-amber-500" />
      Reconectando sincronizacion en vivo...
    </div>
  );
}
