"use server";

import { revalidatePath } from "next/cache";
import type { CardStatus } from "@prisma/client";

import { failure, fromZodError, success, type ActionResult } from "@/lib/action-result";
import { normalizeEmailRecipients } from "@/lib/board-email-notifications";
import { requireUser } from "@/lib/auth/session";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import {
  createBoardAutomationRuleSchema,
  deleteBoardAutomationRuleSchema,
  toggleBoardAutomationRuleSchema,
} from "@/lib/validators/automation";
import type { BoardAutomationRuleView } from "@/types/action-contracts";

async function requireOwner(boardId: string, userId: string) {
  const membership = await getBoardMembership(boardId, userId);

  if (!membership) {
    return null;
  }

  if (membership.role !== "OWNER") {
    return "forbidden" as const;
  }

  return membership;
}

function serializeRule(rule: {
  id: string;
  name: string;
  active: boolean;
  triggerType: "CARD_STATUS_CHANGED";
  triggerStatus: CardStatus;
  moveToListId: string | null;
  moveToList: { name: string } | null;
  assignUserIds: string[];
  dueInDays: number | null;
  emailRecipients: string[];
  createdAt: Date;
  updatedAt: Date;
}): BoardAutomationRuleView {
  return {
    id: rule.id,
    name: rule.name,
    active: rule.active,
    triggerType: rule.triggerType,
    triggerStatus: rule.triggerStatus,
    moveToListId: rule.moveToListId,
    moveToListName: rule.moveToList?.name ?? null,
    assignUserIds: rule.assignUserIds,
    dueInDays: rule.dueInDays,
    emailRecipients: rule.emailRecipients,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function listBoardAutomationRulesAction(
  boardId: string,
): Promise<ActionResult<{ rules: BoardAutomationRuleView[] }>> {
  const user = await requireUser();
  const guard = await requireOwner(boardId, user.id);

  if (!guard) {
    return failure("No tenés acceso a este tablero.");
  }

  if (guard === "forbidden") {
    return failure("Solo el propietario puede gestionar automatizaciones.");
  }

  const rules = await prisma.boardAutomationRule.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
    include: {
      moveToList: {
        select: {
          name: true,
        },
      },
    },
  });

  return success({
    rules: rules.map(serializeRule),
  });
}

export async function createBoardAutomationRuleAction(
  input: unknown,
): Promise<ActionResult<{ rule: BoardAutomationRuleView }>> {
  const user = await requireUser();
  const parsed = createBoardAutomationRuleSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const guard = await requireOwner(parsed.data.boardId, user.id);

  if (!guard) {
    return failure("No tenés acceso a este tablero.");
  }

  if (guard === "forbidden") {
    return failure("Solo el propietario puede gestionar automatizaciones.");
  }

  const assignUserIds = [...new Set(parsed.data.assignUserIds)];
  const emailRecipients = normalizeEmailRecipients(parsed.data.emailRecipients);

  const [moveToList, members] = await Promise.all([
    parsed.data.moveToListId
      ? prisma.list.findFirst({
          where: {
            id: parsed.data.moveToListId,
            boardId: parsed.data.boardId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : null,
    assignUserIds.length
      ? prisma.boardMember.findMany({
          where: {
            boardId: parsed.data.boardId,
            userId: {
              in: assignUserIds,
            },
          },
          select: {
            userId: true,
          },
        })
      : [],
  ]);

  if (parsed.data.moveToListId && !moveToList) {
    return failure("La lista elegida no pertenece a este tablero.");
  }

  if (members.length !== assignUserIds.length) {
    return failure("Hay responsables seleccionados que no pertenecen a este tablero.");
  }

  const rule = await prisma.boardAutomationRule.create({
    data: {
      boardId: parsed.data.boardId,
      name: parsed.data.name,
      triggerStatus: parsed.data.triggerStatus,
      moveToListId: moveToList?.id ?? null,
      assignUserIds,
      dueInDays: parsed.data.dueInDays ?? null,
      emailRecipients,
      active: parsed.data.active,
    },
    include: {
      moveToList: {
        select: {
          name: true,
        },
      },
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(
    {
      rule: serializeRule(rule),
    },
    "Automatización creada.",
  );
}

export async function toggleBoardAutomationRuleAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = toggleBoardAutomationRuleSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const guard = await requireOwner(parsed.data.boardId, user.id);

  if (!guard) {
    return failure("No tenés acceso a este tablero.");
  }

  if (guard === "forbidden") {
    return failure("Solo el propietario puede gestionar automatizaciones.");
  }

  const updated = await prisma.boardAutomationRule.updateMany({
    where: {
      id: parsed.data.automationRuleId,
      boardId: parsed.data.boardId,
    },
    data: {
      active: parsed.data.active,
    },
  });

  if (!updated.count) {
    return failure("La automatización no existe.");
  }

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, parsed.data.active ? "Automatización activada." : "Automatización pausada.");
}

export async function deleteBoardAutomationRuleAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteBoardAutomationRuleSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const guard = await requireOwner(parsed.data.boardId, user.id);

  if (!guard) {
    return failure("No tenés acceso a este tablero.");
  }

  if (guard === "forbidden") {
    return failure("Solo el propietario puede gestionar automatizaciones.");
  }

  const deleted = await prisma.boardAutomationRule.deleteMany({
    where: {
      id: parsed.data.automationRuleId,
      boardId: parsed.data.boardId,
    },
  });

  if (!deleted.count) {
    return failure("La automatización no existe.");
  }

  revalidatePath(`/boards/${parsed.data.boardId}`);

  return success(undefined, "Automatización eliminada.");
}
