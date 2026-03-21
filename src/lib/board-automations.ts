import "server-only";

import { addDays, startOfDay } from "date-fns";
import { ActivityType, type CardStatus } from "@prisma/client";

import { enqueueBoardEmailDeliveryJob } from "@/lib/board-email-notifications";
import { createNotifications } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/observability";

type RunBoardStatusAutomationsInput = {
  boardId: string;
  cardId: string;
  cardTitle: string;
  oldStatus: CardStatus | null;
  newStatus: CardStatus;
  triggeredByUserId: string;
  triggeredByName: string;
};

type RunBoardStatusAutomationsResult = {
  appliedRuleNames: string[];
  automationAssignedUserIds: string[];
};

function sameDay(left: Date | null, right: Date | null) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.getTime() === right.getTime();
}

export async function runBoardStatusAutomations(
  input: RunBoardStatusAutomationsInput,
): Promise<RunBoardStatusAutomationsResult> {
  try {
    const [rules, card] = await Promise.all([
      prisma.boardAutomationRule.findMany({
        where: {
          boardId: input.boardId,
          active: true,
          triggerType: "CARD_STATUS_CHANGED",
          triggerStatus: input.newStatus,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.card.findFirst({
        where: {
          id: input.cardId,
          boardId: input.boardId,
        },
        select: {
          id: true,
          listId: true,
          dueDate: true,
          assignments: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    if (!rules.length || !card) {
      return {
        appliedRuleNames: [],
        automationAssignedUserIds: [],
      };
    }

    const currentAssigneeIds = new Set(card.assignments.map((assignment) => assignment.userId));
    const automationAssignedUserIds = new Set<string>();
    const appliedRuleNames: string[] = [];
    let currentListId = card.listId;
    let currentDueDate = card.dueDate;

    for (const rule of rules) {
      const cardUpdate: {
        listId?: string;
        position?: number;
        dueDate?: Date;
      } = {};
      let changed = false;

      if (rule.moveToListId && rule.moveToListId !== currentListId) {
        const targetPosition = await prisma.card.count({
          where: {
            listId: rule.moveToListId,
            NOT: { id: input.cardId },
          },
        });

        cardUpdate.listId = rule.moveToListId;
        cardUpdate.position = targetPosition;
        currentListId = rule.moveToListId;
        changed = true;
      }

      if (rule.dueInDays != null) {
        const nextDueDate = startOfDay(addDays(new Date(), rule.dueInDays));

        if (!sameDay(currentDueDate, nextDueDate)) {
          cardUpdate.dueDate = nextDueDate;
          currentDueDate = nextDueDate;
          changed = true;
        }
      }

      if (Object.keys(cardUpdate).length > 0) {
        await prisma.card.update({
          where: { id: input.cardId },
          data: cardUpdate,
        });
      }

      const newAssigneeIds = rule.assignUserIds.filter((userId) => !currentAssigneeIds.has(userId));

      if (newAssigneeIds.length) {
        await prisma.cardAssignment.createMany({
          data: newAssigneeIds.map((userId) => ({
            cardId: input.cardId,
            userId,
          })),
          skipDuplicates: true,
        });

        newAssigneeIds.forEach((userId) => {
          currentAssigneeIds.add(userId);
          automationAssignedUserIds.add(userId);
        });
        changed = true;
      }

      if (rule.emailRecipients.length) {
        await enqueueBoardEmailDeliveryJob({
          boardId: input.boardId,
          event: "card.status_changed",
          data: {
            cardId: input.cardId,
            cardTitle: input.cardTitle,
            oldStatus: input.oldStatus,
            newStatus: input.newStatus,
            updatedBy: "Automatización",
            automationRuleName: rule.name,
            triggeredBy: input.triggeredByName,
          },
          recipients: rule.emailRecipients,
        });
        changed = true;
      }

      if (!changed) {
        continue;
      }

      appliedRuleNames.push(rule.name);
      logActivity({
        boardId: input.boardId,
        userId: input.triggeredByUserId,
        type: ActivityType.AUTOMATION_APPLIED,
        summary: `activó la automatización "${rule.name}" en "${input.cardTitle}"`,
        meta: {
          cardId: input.cardId,
          cardTitle: input.cardTitle,
          newValue: input.newStatus,
        },
      });
    }

    if (automationAssignedUserIds.size) {
      createNotifications(
        [...automationAssignedUserIds]
          .filter((userId) => userId !== input.triggeredByUserId)
          .map((userId) => ({
          type: "CARD_ASSIGNED" as const,
          userId,
          actorName: "Automatización",
          cardTitle: input.cardTitle,
          boardId: input.boardId,
          cardId: input.cardId,
          })),
      );
    }

    return {
      appliedRuleNames,
      automationAssignedUserIds: [...automationAssignedUserIds],
    };
  } catch (error) {
    logError("board_automation.run_failed", {
      boardId: input.boardId,
      cardId: input.cardId,
      oldStatus: input.oldStatus,
      newStatus: input.newStatus,
      error,
    });

    return {
      appliedRuleNames: [],
      automationAssignedUserIds: [],
    };
  }
}
