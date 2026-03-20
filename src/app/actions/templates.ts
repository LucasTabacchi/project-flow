"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, fromZodError, success, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import { touchBoard } from "@/lib/board-realtime";
import { BOARD_THEMES } from "@/lib/constants";
import type {
  TemplateCardSnapshot,
  TemplateListSnapshot,
  TemplateSnapshot,
  TemplateSummary,
} from "@/types/action-contracts";

// ── Validators ────────────────────────────────────────────────────────────────

const entityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/);

const saveTemplateSchema = z.object({
  boardId: entityIdSchema,
  name: z.string().trim().min(3, "El nombre necesita al menos 3 caracteres.").max(80),
  description: z
    .string()
    .trim()
    .max(240)
    .optional()
    .transform((v) => v || undefined),
  isPublic: z.boolean().default(false),
  // Whether to include card content (title + description) or just list structure
  includeCards: z.boolean().default(true),
});

const createFromTemplateSchema = z.object({
  templateId: entityIdSchema,
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).optional().transform((v) => v || undefined),
  theme: z.enum(BOARD_THEMES.map((t) => t.value) as [string, ...string[]]),
});

const deleteTemplateSchema = z.object({
  templateId: entityIdSchema,
});

const updateTemplateSchema = z.object({
  templateId: entityIdSchema,
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).optional().transform((v) => v || undefined),
  isPublic: z.boolean(),
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function saveAsBoardTemplateAction(
  input: unknown,
): Promise<ActionResult<{ templateId: string }>> {
  const user = await requireUser();
  const parsed = saveTemplateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const membership = await getBoardMembership(parsed.data.boardId, user.id);
  if (!membership) return failure("No tenés acceso a este tablero.");
  if (membership.role !== "OWNER") return failure("Solo el propietario puede guardar plantillas.");

  // Fetch board structure
  const board = await prisma.board.findUnique({
    where: { id: parsed.data.boardId },
    include: {
      lists: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            select: {
              title: true,
              description: true,
              priority: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!board) return failure("Tablero no encontrado.");

  const snapshot: TemplateSnapshot = {
    lists: board.lists.map((list) => ({
      name: list.name,
      position: list.position,
      cards: parsed.data.includeCards
        ? list.cards.map((card) => ({
            title: card.title,
            description: card.description,
            priority: card.priority,
            status: card.status,
          }))
        : [],
    })),
  };

  const template = await prisma.boardTemplate.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      theme: board.theme,
      snapshot,
      isPublic: parsed.data.isPublic,
    },
  });

  return success({ templateId: template.id }, "Plantilla guardada.");
}

export async function createBoardFromTemplateAction(
  input: unknown,
): Promise<ActionResult<{ boardId: string }>> {
  const user = await requireUser();
  const parsed = createFromTemplateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const template = await prisma.boardTemplate.findFirst({
    where: {
      id: parsed.data.templateId,
      OR: [{ ownerId: user.id }, { isPublic: true }],
    },
  });

  if (!template) return failure("Plantilla no encontrada o sin acceso.");

  const snapshot = template.snapshot as TemplateSnapshot;

  // Create board + lists + cards in a transaction
  const board = await prisma.$transaction(async (tx) => {
    const newBoard = await tx.board.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        theme: parsed.data.theme,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
        labels: {
          createMany: {
            data: [
              { name: "Frontend", color: "SKY" },
              { name: "Backend", color: "VIOLET" },
              { name: "Diseño", color: "ROSE" },
              { name: "Urgente", color: "AMBER" },
            ],
          },
        },
      },
    });

    // Create lists and cards from snapshot
    for (const listSnap of snapshot.lists) {
      const list = await tx.list.create({
        data: {
          boardId: newBoard.id,
          name: listSnap.name,
          position: listSnap.position,
        },
      });

      if (listSnap.cards.length > 0) {
        await tx.card.createMany({
          data: listSnap.cards.map((card, idx) => ({
            boardId: newBoard.id,
            listId: list.id,
            createdById: user.id,
            title: card.title,
            description: card.description,
            priority: card.priority as "LOW" | "MEDIUM" | "HIGH",
            status: card.status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED",
            position: idx,
          })),
        });
      }
    }

    return newBoard;
  });

  revalidatePath("/dashboard");
  return success({ boardId: board.id }, "Tablero creado desde plantilla.");
}

export async function listBoardTemplatesAction(): Promise<
  ActionResult<{ own: TemplateSummary[]; public: TemplateSummary[] }>
> {
  const user = await requireUser();

  const [ownTemplates, publicTemplates] = await Promise.all([
    prisma.boardTemplate.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.boardTemplate.findMany({
      where: { isPublic: true, ownerId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  function toSummary(t: Awaited<ReturnType<typeof prisma.boardTemplate.findMany>>[number], isOwn: boolean): TemplateSummary {
    const snap = t.snapshot as TemplateSnapshot;
    const cardCount = snap.lists.reduce((acc, l) => acc + l.cards.length, 0);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      theme: t.theme,
      isPublic: t.isPublic,
      listCount: snap.lists.length,
      cardCount,
      createdAt: t.createdAt.toISOString(),
      isOwn,
    };
  }

  return success({
    own: ownTemplates.map((t) => toSummary(t, true)),
    public: publicTemplates.map((t) => toSummary(t, false)),
  });
}

export async function deleteTemplateAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteTemplateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const template = await prisma.boardTemplate.findFirst({
    where: { id: parsed.data.templateId, ownerId: user.id },
  });
  if (!template) return failure("Plantilla no encontrada.");

  await prisma.boardTemplate.delete({ where: { id: parsed.data.templateId } });
  return success(undefined, "Plantilla eliminada.");
}

export async function updateTemplateAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const template = await prisma.boardTemplate.findFirst({
    where: { id: parsed.data.templateId, ownerId: user.id },
  });
  if (!template) return failure("Plantilla no encontrada.");

  await prisma.boardTemplate.update({
    where: { id: parsed.data.templateId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isPublic: parsed.data.isPublic,
    },
  });

  return success(undefined, "Plantilla actualizada.");
}
