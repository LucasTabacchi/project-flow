import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  createPresenceFingerprint,
  getBoardPresence,
  getBoardSyncState,
} from "@/lib/board-realtime";
import { getBoardMembership } from "@/lib/data/boards";
import {
  BOARD_EVENTS_HEARTBEAT_MS,
  BOARD_EVENTS_POLL_INTERVAL_MS,
} from "@/lib/realtime-constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    boardId: string;
  }>;
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
    return NextResponse.json(
      {
        message: "Necesitás iniciar sesión.",
      },
      {
        status: 401,
      },
    );
  }

  const { boardId } = await params;
  const membership = await getBoardMembership(boardId, user.id);

  if (!membership) {
    return NextResponse.json(
      {
        message: "No tenés acceso a este tablero.",
      },
      {
        status: 403,
      },
    );
  }

  const [initialState, initialPresence] = await Promise.all([
    getBoardSyncState(boardId),
    getBoardPresence(boardId),
  ]);

  if (!initialState) {
    return NextResponse.json(
      {
        message: "No encontramos el tablero.",
      },
      {
        status: 404,
      },
    );
  }

  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let lastKnownUpdatedAt = initialState.updatedAt.toISOString();
      let lastPresenceFingerprint = createPresenceFingerprint(initialPresence);
      const send = (event: string, data: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(createEventMessage(event, data)));
      };

      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
      };

      const pollTimer = setInterval(async () => {
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
            send("board-updated", {
              updatedAt: nextUpdatedAt,
            });
          }

          const nextPresenceFingerprint = createPresenceFingerprint(presence);

          if (nextPresenceFingerprint !== lastPresenceFingerprint) {
            lastPresenceFingerprint = nextPresenceFingerprint;
            send("presence-updated", {
              presence,
            });
          }
        } catch {
          cleanup();
          controller.close();
        }
      }, BOARD_EVENTS_POLL_INTERVAL_MS);

      const heartbeatTimer = setInterval(() => {
        send("ping", {
          updatedAt: lastKnownUpdatedAt,
        });
      }, BOARD_EVENTS_HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        cleanup();
        controller.close();
      });

      send("connected", {
        updatedAt: lastKnownUpdatedAt,
        presence: initialPresence,
      });

      if (since && since !== lastKnownUpdatedAt) {
        send("board-updated", {
          updatedAt: lastKnownUpdatedAt,
        });
      }
    },
  });

  return new Response(stream, {
    headers: sseHeaders(),
  });
}
