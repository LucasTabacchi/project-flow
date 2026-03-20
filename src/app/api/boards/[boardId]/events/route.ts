import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  createPresenceFingerprint,
  getBoardPresence,
  getBoardSyncState,
  subscribeToBoardRealtime,
  type BoardRealtimeEvent,
} from "@/lib/board-realtime";
import { getBoardMembership } from "@/lib/data/boards";
import {
  isRedisConfigured,
  redisGetBoardRevision,
  redisGetBoardEvent,
} from "@/lib/redis";
import {
  BOARD_EVENTS_HEARTBEAT_MS,
  BOARD_EVENTS_FALLBACK_POLL_INTERVAL_MS,
} from "@/lib/realtime-constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

function sseHeaders() {
  return {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
  };
}

function createEventMessage(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Necesitás iniciar sesión." }, { status: 401 });
  }

  const { boardId } = await params;
  const membership = await getBoardMembership(boardId, user.id);

  if (!membership) {
    return NextResponse.json({ message: "No tenés acceso a este tablero." }, { status: 403 });
  }

  const [initialState, initialPresence] = await Promise.all([
    getBoardSyncState(boardId),
    getBoardPresence(boardId),
  ]);

  if (!initialState) {
    return NextResponse.json({ message: "No encontramos el tablero." }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  const useRedis = isRedisConfigured();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let lastKnownUpdatedAt = initialState.updatedAt.toISOString();
      let lastPresenceFingerprint = createPresenceFingerprint(initialPresence);
      // Revision counter de Redis — para detectar eventos de otras instancias
      let lastKnownRedisRevision = 0;

      // Suscribir a eventos locales (misma instancia)
      const unsubscribe = subscribeToBoardRealtime(boardId, (event) => {
        handleEvent(event);
      });

      function handleEvent(event: BoardRealtimeEvent) {
        if (event.type === "board-updated") {
          if (event.updatedAt === lastKnownUpdatedAt) return;
          lastKnownUpdatedAt = event.updatedAt;
          send("board-updated", { updatedAt: event.updatedAt });
          return;
        }

        if (event.type === "presence-updated") {
          const fp = createPresenceFingerprint(event.presence);
          if (fp === lastPresenceFingerprint) return;
          lastPresenceFingerprint = fp;
          send("presence-updated", { presence: event.presence });
          return;
        }

        // board-removed
        send("board-removed", {});
        cleanup();
        controller.close();
      }

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(createEventMessage(event, data)));
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(fallbackTimer);
        if (redisTimer) clearInterval(redisTimer);
        clearInterval(heartbeatTimer);
      };

      // ── Poll Redis cada 2s para detectar eventos de otras instancias ──────
      // Solo activo cuando Redis está configurado.
      // Lee el revision counter — si cambió, lee el evento y lo aplica.
      const redisTimer = useRedis
        ? setInterval(async () => {
            try {
              const rev = await redisGetBoardRevision(boardId);
              if (rev <= lastKnownRedisRevision) return;
              lastKnownRedisRevision = rev;

              // Hay un evento nuevo — leerlo y procesarlo
              const raw = await redisGetBoardEvent(boardId);
              if (!raw) return;

              const event = JSON.parse(raw) as BoardRealtimeEvent;
              handleEvent(event);
            } catch {
              // Redis falla silenciosamente
            }
          }, 2000)
        : null;

      // ── Fallback poll DB cada 30s ─────────────────────────────────────────
      // Cubre el caso de que Redis no esté configurado o falle.
      const fallbackTimer = setInterval(async () => {
        try {
          const [state, presence] = await Promise.all([
            getBoardSyncState(boardId),
            getBoardPresence(boardId),
          ]);

          if (!state) {
            send("board-removed", {});
            cleanup();
            controller.close();
            return;
          }

          const nextUpdatedAt = state.updatedAt.toISOString();
          if (nextUpdatedAt !== lastKnownUpdatedAt) {
            lastKnownUpdatedAt = nextUpdatedAt;
            send("board-updated", { updatedAt: nextUpdatedAt });
          }

          const fp = createPresenceFingerprint(presence);
          if (fp !== lastPresenceFingerprint) {
            lastPresenceFingerprint = fp;
            send("presence-updated", { presence });
          }
        } catch {
          cleanup();
          controller.close();
        }
      }, BOARD_EVENTS_FALLBACK_POLL_INTERVAL_MS);

      // ── Heartbeat ─────────────────────────────────────────────────────────
      const heartbeatTimer = setInterval(() => {
        send("ping", { updatedAt: lastKnownUpdatedAt });
      }, BOARD_EVENTS_HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        cleanup();
        controller.close();
      });

      // Evento inicial
      send("connected", { updatedAt: lastKnownUpdatedAt, presence: initialPresence });

      if (since && since !== lastKnownUpdatedAt) {
        send("board-updated", { updatedAt: lastKnownUpdatedAt });
      }

      // Inicializar revision counter de Redis
      if (useRedis) {
        redisGetBoardRevision(boardId)
          .then((rev) => { lastKnownRedisRevision = rev; })
          .catch(() => {});
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
