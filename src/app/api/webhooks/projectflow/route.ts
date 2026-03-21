import { NextResponse } from "next/server";

import { logInfo, logWarn } from "@/lib/observability";
import {
  isProjectFlowWebhookFresh,
  projectFlowWebhookPayloadSchema,
  PROJECTFLOW_WEBHOOK_RECEIVER_EVENTS,
  verifyProjectFlowWebhookSignature,
  type ProjectFlowWebhookPayload,
} from "@/lib/projectflow-webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

function getToleranceMs() {
  const rawValue = process.env.PROJECTFLOW_WEBHOOK_TOLERANCE_MS;

  if (!rawValue) {
    return DEFAULT_TOLERANCE_MS;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_TOLERANCE_MS;
}

function buildErrorResponse(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function handleProjectFlowWebhook(payload: ProjectFlowWebhookPayload) {
  switch (payload.event) {
    case "webhook.test":
      logInfo("projectflow.webhook.test", {
        boardId: payload.boardId,
        message: payload.data.message,
      });
      return;
    case "card.created":
      logInfo("projectflow.webhook.card_created", payload);
      return;
    case "card.moved":
      logInfo("projectflow.webhook.card_moved", payload);
      return;
    case "card.status_changed":
      logInfo("projectflow.webhook.card_status_changed", payload);
      return;
    case "card.assigned":
      logInfo("projectflow.webhook.card_assigned", payload);
      return;
    case "comment.added":
      logInfo("projectflow.webhook.comment_added", payload);
      return;
    case "list.created":
      logInfo("projectflow.webhook.list_created", payload);
      return;
    case "member.joined":
      logInfo("projectflow.webhook.member_joined", payload);
      return;
    default:
      {
        const exhaustiveEvent: never = payload.event;
        logWarn("projectflow.webhook.unhandled_event", {
          event: exhaustiveEvent,
          boardId: payload.boardId,
        });
      }
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: "ProjectFlow",
    method: "POST",
    path: "/api/webhooks/projectflow",
    supportedEvents: PROJECTFLOW_WEBHOOK_RECEIVER_EVENTS,
  });
}

export async function POST(request: Request) {
  const secret = process.env.PROJECTFLOW_WEBHOOK_SECRET;

  if (!secret) {
    logWarn("projectflow.webhook.misconfigured", {
      reason: "missing_secret",
      envVar: "PROJECTFLOW_WEBHOOK_SECRET",
    });
    return buildErrorResponse(500, "Webhook receiver no configurado.");
  }

  const signature = request.headers.get("X-ProjectFlow-Signature");
  const eventHeader = request.headers.get("X-ProjectFlow-Event");

  if (!signature) {
    return buildErrorResponse(401, "Falta la firma del webhook.");
  }

  const rawBody = await request.text();

  if (!verifyProjectFlowWebhookSignature(rawBody, signature, secret)) {
    logWarn("projectflow.webhook.invalid_signature", {
      eventHeader,
    });
    return buildErrorResponse(401, "Firma inválida.");
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return buildErrorResponse(400, "Payload JSON inválido.");
  }

  const parsedPayload = projectFlowWebhookPayloadSchema.safeParse(parsedBody);

  if (!parsedPayload.success) {
    return buildErrorResponse(400, "Payload del webhook inválido.");
  }

  const payload = parsedPayload.data;

  if (eventHeader && eventHeader !== payload.event) {
    return buildErrorResponse(400, "El header del evento no coincide con el payload.");
  }

  if (!isProjectFlowWebhookFresh(payload.timestamp, getToleranceMs())) {
    return buildErrorResponse(408, "Webhook expirado o fuera de tolerancia.");
  }

  await handleProjectFlowWebhook(payload);

  return new NextResponse(null, { status: 204 });
}
