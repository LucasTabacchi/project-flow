"use server";

import { randomBytes, createHmac } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, fromZodError, success, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";

// ── Constants ─────────────────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  "card.created",
  "card.moved",
  "card.status_changed",
  "card.assigned",
  "comment.added",
  "list.created",
  "member.joined",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type WebhookView = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  createdAt: string;
  recentDeliveries: {
    id: string;
    event: string;
    success: boolean;
    statusCode: number | null;
    createdAt: string;
  }[];
};

// ── Validators ────────────────────────────────────────────────────────────────

const entityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/);

const createWebhookSchema = z.object({
  boardId: entityIdSchema,
  url: z.string().trim().url("Ingresá una URL válida.").max(500),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "Seleccioná al menos un evento.")
    .max(WEBHOOK_EVENTS.length),
});

const updateWebhookSchema = z.object({
  boardId: entityIdSchema,
  webhookId: entityIdSchema,
  url: z.string().trim().url("Ingresá una URL válida.").max(500),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).max(WEBHOOK_EVENTS.length),
  active: z.boolean(),
});

const deleteWebhookSchema = z.object({
  boardId: entityIdSchema,
  webhookId: entityIdSchema,
});

const testWebhookSchema = z.object({
  boardId: entityIdSchema,
  webhookId: entityIdSchema,
});

// ── Guards ────────────────────────────────────────────────────────────────────

async function requireOwner(boardId: string, userId: string) {
  const m = await getBoardMembership(boardId, userId);
  if (!m) return null;
  if (m.role !== "OWNER") return "forbidden" as const;
  return m;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createWebhookAction(
  input: unknown,
): Promise<ActionResult<{ webhookId: string }>> {
  const user = await requireUser();
  const parsed = createWebhookSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const guard = await requireOwner(parsed.data.boardId, user.id);
  if (!guard) return failure("No tenés acceso a este tablero.");
  if (guard === "forbidden") return failure("Solo el propietario puede gestionar webhooks.");

  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      boardId: parsed.data.boardId,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return success({ webhookId: webhook.id }, "Webhook creado.");
}

export async function updateWebhookAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateWebhookSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const guard = await requireOwner(parsed.data.boardId, user.id);
  if (!guard) return failure("No tenés acceso a este tablero.");
  if (guard === "forbidden") return failure("Solo el propietario puede gestionar webhooks.");

  const webhook = await prisma.webhook.findFirst({
    where: { id: parsed.data.webhookId, boardId: parsed.data.boardId },
  });
  if (!webhook) return failure("Webhook no encontrado.");

  await prisma.webhook.update({
    where: { id: parsed.data.webhookId },
    data: {
      url: parsed.data.url,
      events: parsed.data.events,
      active: parsed.data.active,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return success(undefined, "Webhook actualizado.");
}

export async function deleteWebhookAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteWebhookSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const guard = await requireOwner(parsed.data.boardId, user.id);
  if (!guard) return failure("No tenés acceso a este tablero.");
  if (guard === "forbidden") return failure("Solo el propietario puede gestionar webhooks.");

  await prisma.webhook.deleteMany({
    where: { id: parsed.data.webhookId, boardId: parsed.data.boardId },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return success(undefined, "Webhook eliminado.");
}

export async function listWebhooksAction(
  boardId: string,
): Promise<ActionResult<{ webhooks: WebhookView[] }>> {
  const user = await requireUser();
  const guard = await requireOwner(boardId, user.id);
  if (!guard) return failure("No tenés acceso a este tablero.");
  if (guard === "forbidden") return failure("Solo el propietario puede ver los webhooks.");

  const webhooks = await prisma.webhook.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
    include: {
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          event: true,
          success: true,
          statusCode: true,
          createdAt: true,
        },
      },
    },
  });

  return success({
    webhooks: webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      secret: w.secret,
      createdAt: w.createdAt.toISOString(),
      recentDeliveries: w.deliveries.map((d) => ({
        id: d.id,
        event: d.event,
        success: d.success,
        statusCode: d.statusCode,
        createdAt: d.createdAt.toISOString(),
      })),
    })),
  });
}

export async function testWebhookAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = testWebhookSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const guard = await requireOwner(parsed.data.boardId, user.id);
  if (!guard) return failure("No tenés acceso a este tablero.");
  if (guard === "forbidden") return failure("Solo el propietario puede testear webhooks.");

  const webhook = await prisma.webhook.findFirst({
    where: { id: parsed.data.webhookId, boardId: parsed.data.boardId },
  });
  if (!webhook) return failure("Webhook no encontrado.");

  const payload = {
    event: "webhook.test",
    boardId: parsed.data.boardId,
    timestamp: new Date().toISOString(),
    data: { message: "Esto es un evento de prueba desde ProjectFlow." },
  };

  const result = await dispatchWebhook({
    webhookId: webhook.id,
    url: webhook.url,
    secret: webhook.secret,
    event: "webhook.test",
    payload,
  });

  if (result.success) {
    return success(undefined, `Test exitoso — HTTP ${result.statusCode}.`);
  }
  return failure(`Test falló — HTTP ${result.statusCode ?? "sin respuesta"}.`);
}

// ── Dispatch engine (fire-and-forget for production use) ──────────────────────

export type DispatchWebhookInput = {
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
};

export async function dispatchWebhook(input: DispatchWebhookInput): Promise<{
  success: boolean;
  statusCode: number | null;
}> {
  const body = JSON.stringify(input.payload);
  const signature = createHmac("sha256", input.secret).update(body).digest("hex");

  let statusCode: number | null = null;
  let success = false;

  try {
    const res = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ProjectFlow-Event": input.event,
        "X-ProjectFlow-Signature": `sha256=${signature}`,
        "X-ProjectFlow-Timestamp": new Date().toISOString(),
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });
    statusCode = res.status;
    success = res.ok;
  } catch {
    // Network error or timeout
  }

  // Record delivery (fire-and-forget)
  void prisma.webhookDelivery
    .create({
      data: {
        webhookId: input.webhookId,
        event: input.event,
        payload: input.payload,
        statusCode,
        success,
      },
    })
    .catch(() => {});

  return { success, statusCode };
}

/**
 * Dispatch an event to all active webhooks on a board that are subscribed to it.
 * Call this fire-and-forget from server actions.
 */
export function fireBoardWebhooks(
  boardId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: { boardId, active: true, events: { has: event } },
        select: { id: true, url: true, secret: true },
      });

      if (!webhooks.length) return;

      const payload = {
        event,
        boardId,
        timestamp: new Date().toISOString(),
        data,
      };

      await Promise.allSettled(
        webhooks.map((wh) =>
          dispatchWebhook({
            webhookId: wh.id,
            url: wh.url,
            secret: wh.secret,
            event,
            payload,
          }),
        ),
      );
    } catch {
      // Never throw — webhooks are best-effort
    }
  })();
}
