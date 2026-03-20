"use server";

import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, fromZodError, success, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { touchBoard } from "@/lib/board-realtime";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import { canEditBoard } from "@/lib/permissions";
import type { RecurrenceFrequency } from "@prisma/client";
import type { RecurringCardView } from "@/types/action-contracts";

// ── Validators ────────────────────────────────────────────────────────────────

const entityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/);

const FREQUENCIES = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const;

const createRecurringSchema = z.object({
  boardId: entityIdSchema,
  listId: entityIdSchema,
  title: z.string().trim().min(2, "El título es demasiado corto.").max(120),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  frequency: z.enum(FREQUENCIES),
  firstDueAt: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), "Fecha inválida."),
  leadDays: z.number().int().min(0).max(30).default(0),
});

const updateRecurringSchema = z.object({
  boardId: entityIdSchema,
  recurringId: entityIdSchema,
  title: z.string().trim().min(2).max(120),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  frequency: z.enum(FREQUENCIES),
  leadDays: z.number().int().min(0).max(30),
  active: z.boolean(),
});

const deleteRecurringSchema = z.object({
  boardId: entityIdSchema,
  recurringId: entityIdSchema,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextOccurrence(current: Date, frequency: RecurrenceFrequency): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(current, 1);
    case "WEEKLY":
      return addWeeks(current, 1);
    case "BIWEEKLY":
      return addWeeks(current, 2);
    case "MONTHLY":
      return addMonths(current, 1);
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createRecurringCardAction(
  input: unknown,
): Promise<ActionResult<{ recurringId: string }>> {
  const user = await requireUser();
  const parsed = createRecurringSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const membership = await getBoardMembership(parsed.data.boardId, user.id);
  if (!membership) return failure("No tenés acceso a este tablero.");
  if (!canEditBoard(membership.role)) return failure("Tu rol no puede crear tarjetas recurrentes.");

  // Verify list belongs to board
  const list = await prisma.list.findFirst({
    where: { id: parsed.data.listId, boardId: parsed.data.boardId },
    select: { id: true },
  });
  if (!list) return failure("La lista no pertenece a este tablero.");

  const recurring = await prisma.recurringCard.create({
    data: {
      boardId: parsed.data.boardId,
      listId: parsed.data.listId,
      createdById: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      frequency: parsed.data.frequency,
      nextDueAt: startOfDay(new Date(parsed.data.firstDueAt)),
      leadDays: parsed.data.leadDays,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return success({ recurringId: recurring.id }, "Tarjeta recurrente creada.");
}

export async function updateRecurringCardAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateRecurringSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const membership = await getBoardMembership(parsed.data.boardId, user.id);
  if (!membership) return failure("No tenés acceso a este tablero.");
  if (!canEditBoard(membership.role)) return failure("Tu rol no puede editar tarjetas recurrentes.");

  const recurring = await prisma.recurringCard.findFirst({
    where: { id: parsed.data.recurringId, boardId: parsed.data.boardId },
  });
  if (!recurring) return failure("Tarjeta recurrente no encontrada.");

  await prisma.recurringCard.update({
    where: { id: parsed.data.recurringId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      frequency: parsed.data.frequency,
      leadDays: parsed.data.leadDays,
      active: parsed.data.active,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return success(undefined, "Tarjeta recurrente actualizada.");
}

export async function deleteRecurringCardAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteRecurringSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const membership = await getBoardMembership(parsed.data.boardId, user.id);
  if (!membership) return failure("No tenés acceso a este tablero.");
  if (!canEditBoard(membership.role)) return failure("Tu rol no puede eliminar tarjetas recurrentes.");

  await prisma.recurringCard.deleteMany({
    where: { id: parsed.data.recurringId, boardId: parsed.data.boardId },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return success(undefined, "Tarjeta recurrente eliminada.");
}

export async function listRecurringCardsAction(
  boardId: string,
): Promise<ActionResult<{ recurring: RecurringCardView[] }>> {
  const user = await requireUser();
  const membership = await getBoardMembership(boardId, user.id);
  if (!membership) return failure("No tenés acceso a este tablero.");

  const rows = await prisma.recurringCard.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
    include: { list: { select: { name: true } } },
  });

  return success({
    recurring: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      frequency: r.frequency,
      nextDueAt: r.nextDueAt.toISOString(),
      leadDays: r.leadDays,
      active: r.active,
      listId: r.listId,
      listName: r.list.name,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

// ── Spawn engine ──────────────────────────────────────────────────────────────
// Call this from the /api/cron/recurring-cards route (protected by CRON_SECRET).
// It materializes any RecurringCard whose (nextDueAt - leadDays) <= today.

export async function spawnDueRecurringCards(): Promise<{
  spawned: number;
  errors: number;
}> {
  const today = startOfDay(new Date());
  let spawned = 0;
  let errors = 0;

  // Find all active recurring cards where it's time to spawn
  const dues = await prisma.recurringCard.findMany({
    where: {
      active: true,
      nextDueAt: {
        // Spawn the card `leadDays` before the due date
        lte: addDays(today, 0), // refined below per-record with leadDays
      },
    },
    select: {
      id: true,
      boardId: true,
      listId: true,
      createdById: true,
      title: true,
      description: true,
      priority: true,
      frequency: true,
      nextDueAt: true,
      leadDays: true,
    },
  });

  for (const rec of dues) {
    // Check actual spawn condition including leadDays
    const spawnDate = addDays(rec.nextDueAt, -rec.leadDays);
    if (spawnDate > today) continue;

    try {
      // Get current card count for position
      const position = await prisma.card.count({ where: { listId: rec.listId } });

      await prisma.$transaction([
        // Create the materialized card
        prisma.card.create({
          data: {
            boardId: rec.boardId,
            listId: rec.listId,
            createdById: rec.createdById,
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            status: "TODO",
            position,
            dueDate: rec.nextDueAt,
            recurringSourceId: rec.id,
          },
        }),
        // Advance nextDueAt to next occurrence
        prisma.recurringCard.update({
          where: { id: rec.id },
          data: {
            nextDueAt: nextOccurrence(rec.nextDueAt, rec.frequency),
          },
        }),
      ]);

      await touchBoard(rec.boardId);
      spawned++;
    } catch {
      errors++;
    }
  }

  return { spawned, errors };
}
