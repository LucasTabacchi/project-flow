import "server-only";

import { addDays, differenceInCalendarDays, subDays } from "date-fns";
import { BoardEmailNotificationJobStatus, Prisma } from "@prisma/client";

import {
  type BoardEmailNotificationEvent,
  type BoardEmailNotificationPayload,
  type BoardEmailReminderCardSummary,
  type BoardEmailReminderEvent,
  type BoardEmailReminderPayloadData,
} from "@/lib/board-email-events";
import { type BoardEvent } from "@/lib/board-events";
import { prisma } from "@/lib/db";
import { sendBoardNotificationEmail } from "@/lib/email";
import { logError, logWarn } from "@/lib/observability";

const reminderCandidateCardSelect = Prisma.validator<Prisma.CardSelect>()({
  id: true,
  title: true,
  dueDate: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  list: {
    select: {
      name: true,
    },
  },
  assignments: {
    select: {
      user: {
        select: {
          name: true,
        },
      },
    },
  },
  comments: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: {
      createdAt: true,
    },
  },
  attachments: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: {
      createdAt: true,
    },
  },
  timeEntries: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: {
      createdAt: true,
    },
  },
  checklists: {
    select: {
      updatedAt: true,
      items: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          updatedAt: true,
        },
      },
    },
  },
  blockedBy: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      createdAt: true,
      blockerCard: {
        select: {
          title: true,
          status: true,
        },
      },
    },
  },
});

type ReminderCandidateCard = Prisma.CardGetPayload<{
  select: typeof reminderCandidateCardSelect;
}>;

type EnqueueBoardEmailDeliveryJobInput = {
  boardId: string;
  event: BoardEmailNotificationEvent;
  data: Record<string, unknown>;
  recipients: string[];
  dedupeKey?: string;
  processNow?: boolean;
};

type EnqueueBoardEmailDeliveryJobResult = {
  queued: boolean;
  duplicate: boolean;
};

type ReminderSettingRecord = {
  boardId: string;
  recipients: string[];
  overdueReminderEnabled: boolean;
  upcomingReminderEnabled: boolean;
  upcomingReminderDays: number;
  inactiveReminderEnabled: boolean;
  inactiveReminderDays: number;
  blockedReminderEnabled: boolean;
  blockedReminderDays: number;
  board: {
    name: string;
  };
};

type ReminderBundle = {
  event: BoardEmailReminderEvent;
  thresholdDays: number;
  cards: BoardEmailReminderCardSummary[];
};

export function normalizeEmailRecipients(recipients: string[]) {
  return [...new Set(recipients.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function getReminderDateKey(referenceDate: Date) {
  return referenceDate.toISOString().slice(0, 10);
}

function buildReminderDedupeKey(
  boardId: string,
  event: BoardEmailReminderEvent,
  referenceDate: Date,
) {
  return `board-email-reminder:${boardId}:${event}:${getReminderDateKey(referenceDate)}`;
}

function getReminderCardBase(card: ReminderCandidateCard): BoardEmailReminderCardSummary {
  return {
    cardId: card.id,
    title: card.title,
    listName: card.list.name,
    status: card.status,
    priority: card.priority,
    dueDate: card.dueDate?.toISOString() ?? null,
    assigneeNames: [...new Set(card.assignments.map((assignment) => assignment.user.name))],
  };
}

function getLastActivityAt(card: ReminderCandidateCard) {
  const timestamps = [
    card.createdAt,
    card.updatedAt,
    ...card.comments.map((comment) => comment.createdAt),
    ...card.attachments.map((attachment) => attachment.createdAt),
    ...card.timeEntries.map((timeEntry) => timeEntry.createdAt),
  ];

  for (const checklist of card.checklists) {
    timestamps.push(checklist.updatedAt);

    for (const item of checklist.items) {
      timestamps.push(item.updatedAt);
    }
  }

  return new Date(Math.max(...timestamps.map((timestamp) => timestamp.getTime())));
}

function getUnresolvedBlockers(card: ReminderCandidateCard) {
  return card.blockedBy.filter((dependency) => dependency.blockerCard.status !== "DONE");
}

function getBlockedSince(card: ReminderCandidateCard) {
  const candidates: Date[] = [];
  const unresolvedBlockers = getUnresolvedBlockers(card);

  if (card.status === "BLOCKED") {
    candidates.push(card.updatedAt);
  }

  if (unresolvedBlockers.length) {
    candidates.push(unresolvedBlockers[0].createdAt);
  }

  if (!candidates.length) {
    return null;
  }

  return new Date(Math.min(...candidates.map((candidate) => candidate.getTime())));
}

async function getReminderCandidateCards(boardId: string) {
  return prisma.card.findMany({
    where: {
      boardId,
      status: {
        not: "DONE",
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    select: reminderCandidateCardSelect,
  });
}

function buildReminderBundles(
  cards: ReminderCandidateCard[],
  settings: ReminderSettingRecord,
  referenceDate: Date,
): ReminderBundle[] {
  const bundles: ReminderBundle[] = [];

  if (settings.overdueReminderEnabled) {
    const overdueCards = cards
      .filter((card) => card.dueDate && card.dueDate < referenceDate)
      .map((card) => ({
        ...getReminderCardBase(card),
        overdueDays: Math.max(1, differenceInCalendarDays(referenceDate, card.dueDate as Date)),
      }));

    if (overdueCards.length) {
      bundles.push({
        event: "reminder.overdue",
        thresholdDays: 0,
        cards: overdueCards,
      });
    }
  }

  if (settings.upcomingReminderEnabled) {
    const upcomingLimit = addDays(referenceDate, settings.upcomingReminderDays);
    const upcomingCards = cards
      .filter(
        (card) =>
          card.dueDate &&
          card.dueDate >= referenceDate &&
          card.dueDate <= upcomingLimit,
      )
      .map((card) => ({
        ...getReminderCardBase(card),
        daysUntilDue: Math.max(
          0,
          differenceInCalendarDays(card.dueDate as Date, referenceDate),
        ),
      }));

    if (upcomingCards.length) {
      bundles.push({
        event: "reminder.upcoming",
        thresholdDays: settings.upcomingReminderDays,
        cards: upcomingCards,
      });
    }
  }

  if (settings.inactiveReminderEnabled) {
    const inactiveCutoff = subDays(referenceDate, settings.inactiveReminderDays);
    const inactiveCards = cards
      .map((card) => ({
        card,
        lastActivityAt: getLastActivityAt(card),
      }))
      .filter(({ lastActivityAt }) => lastActivityAt <= inactiveCutoff)
      .map(({ card, lastActivityAt }) => ({
        ...getReminderCardBase(card),
        lastActivityAt: lastActivityAt.toISOString(),
        inactiveDays: Math.max(
          settings.inactiveReminderDays,
          differenceInCalendarDays(referenceDate, lastActivityAt),
        ),
      }));

    if (inactiveCards.length) {
      bundles.push({
        event: "reminder.inactive",
        thresholdDays: settings.inactiveReminderDays,
        cards: inactiveCards,
      });
    }
  }

  if (settings.blockedReminderEnabled) {
    const blockedCards = cards
      .map((card) => {
        const blockedSince = getBlockedSince(card);
        const unresolvedBlockers = getUnresolvedBlockers(card);

        if (!blockedSince) {
          return null;
        }

        return {
          card,
          blockedSince,
          unresolvedBlockers,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .filter(
        ({ blockedSince }) =>
          differenceInCalendarDays(referenceDate, blockedSince) >=
          settings.blockedReminderDays,
      )
      .map(({ card, blockedSince, unresolvedBlockers }) => ({
        ...getReminderCardBase(card),
        blockedSince: blockedSince.toISOString(),
        blockedDays: Math.max(
          settings.blockedReminderDays,
          differenceInCalendarDays(referenceDate, blockedSince),
        ),
        blockedByTitles: [...new Set(unresolvedBlockers.map((dependency) => dependency.blockerCard.title))],
      }));

    if (blockedCards.length) {
      bundles.push({
        event: "reminder.blocked",
        thresholdDays: settings.blockedReminderDays,
        cards: blockedCards,
      });
    }
  }

  return bundles;
}

async function processBoardEmailNotificationJob(jobId: string) {
  const claim = await prisma.boardEmailNotificationJob.updateMany({
    where: {
      id: jobId,
      status: {
        in: [
          BoardEmailNotificationJobStatus.PENDING,
          BoardEmailNotificationJobStatus.FAILED,
        ],
      },
    },
    data: {
      status: BoardEmailNotificationJobStatus.PROCESSING,
      attempts: {
        increment: 1,
      },
      lastError: null,
    },
  });

  if (!claim.count) {
    return false;
  }

  const job = await prisma.boardEmailNotificationJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      boardId: true,
      event: true,
      payload: true,
      recipients: true,
    },
  });

  if (!job) {
    return false;
  }

  const result = await sendBoardNotificationEmail(
    job.payload as BoardEmailNotificationPayload,
    job.recipients,
  );

  if (result.sent) {
    await prisma.boardEmailNotificationJob.update({
      where: { id: jobId },
      data: {
        status: BoardEmailNotificationJobStatus.SENT,
        sentAt: new Date(),
      },
    });
    return true;
  }

  await prisma.boardEmailNotificationJob.update({
    where: { id: jobId },
    data: {
      status: BoardEmailNotificationJobStatus.FAILED,
      lastError: result.reason.slice(0, 500),
    },
  });

  return false;
}

export async function processPendingBoardEmailNotificationJobs(limit = 10) {
  const jobs = await prisma.boardEmailNotificationJob.findMany({
    where: {
      status: {
        in: [
          BoardEmailNotificationJobStatus.PENDING,
          BoardEmailNotificationJobStatus.FAILED,
        ],
      },
      attempts: {
        lt: 5,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
    select: {
      id: true,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const success = await processBoardEmailNotificationJob(job.id);
      if (success) {
        sent += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      logError("board_email_notification.job_processing_failed", {
        jobId: job.id,
        error,
      });
    }
  }

  return {
    processed: jobs.length,
    sent,
    failed,
  };
}

export async function enqueueBoardEmailDeliveryJob(
  input: EnqueueBoardEmailDeliveryJobInput,
): Promise<EnqueueBoardEmailDeliveryJobResult> {
  const recipients = normalizeEmailRecipients(input.recipients);

  if (!recipients.length) {
    return {
      queued: false,
      duplicate: false,
    };
  }

  const payload: BoardEmailNotificationPayload = {
    event: input.event,
    boardId: input.boardId,
    timestamp: new Date().toISOString(),
    data: input.data,
  };

  let jobId: string | null = null;

  try {
    const job = await prisma.boardEmailNotificationJob.create({
      data: {
        boardId: input.boardId,
        event: input.event,
        payload: payload as Prisma.InputJsonValue,
        recipients,
        dedupeKey: input.dedupeKey ?? null,
      },
      select: {
        id: true,
      },
    });

    jobId = job.id;
  } catch (error) {
    if (
      input.dedupeKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        queued: false,
        duplicate: true,
      };
    }

    throw error;
  }

  if (input.processNow !== false && jobId) {
    void processPendingBoardEmailNotificationJobs(1).catch((error) => {
      logError("board_email_notification.enqueue_processing_failed", {
        boardId: input.boardId,
        event: input.event,
        jobId,
        error,
      });
    });
  }

  return {
    queued: true,
    duplicate: false,
  };
}

export async function enqueueBoardEmailNotificationJob(
  boardId: string,
  event: BoardEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const setting = await prisma.boardEmailNotificationSetting.findUnique({
      where: { boardId },
      select: {
        active: true,
        events: true,
        recipients: true,
      },
    });

    if (
      !setting?.active ||
      !setting.events.includes(event) ||
      setting.recipients.length === 0
    ) {
      return;
    }

    const recipients = normalizeEmailRecipients(setting.recipients);

    if (!recipients.length) {
      return;
    }

    await enqueueBoardEmailDeliveryJob({
      boardId,
      event,
      data,
      recipients,
    });
  } catch (error) {
    logError("board_email_notification.enqueue_failed", {
      boardId,
      event,
      error,
    });
  }
}

export async function enqueueBoardReminderNotificationJobs(referenceDate = new Date()) {
  const settings = await prisma.boardEmailNotificationSetting.findMany({
    where: {
      remindersActive: true,
    },
    select: {
      boardId: true,
      recipients: true,
      overdueReminderEnabled: true,
      upcomingReminderEnabled: true,
      upcomingReminderDays: true,
      inactiveReminderEnabled: true,
      inactiveReminderDays: true,
      blockedReminderEnabled: true,
      blockedReminderDays: true,
      board: {
        select: {
          name: true,
        },
      },
    },
  });

  let queued = 0;
  let duplicates = 0;
  let boardsEvaluated = 0;

  for (const setting of settings as ReminderSettingRecord[]) {
    const recipients = normalizeEmailRecipients(setting.recipients);

    if (!recipients.length) {
      continue;
    }

    if (
      !setting.overdueReminderEnabled &&
      !setting.upcomingReminderEnabled &&
      !setting.inactiveReminderEnabled &&
      !setting.blockedReminderEnabled
    ) {
      continue;
    }

    boardsEvaluated += 1;

    try {
      const cards = await getReminderCandidateCards(setting.boardId);
      const bundles = buildReminderBundles(cards, setting, referenceDate);

      for (const bundle of bundles) {
        const payload: BoardEmailReminderPayloadData = {
          boardName: setting.board.name,
          thresholdDays: bundle.thresholdDays,
          cards: bundle.cards,
        };

        const result = await enqueueBoardEmailDeliveryJob({
          boardId: setting.boardId,
          event: bundle.event,
          data: payload as unknown as Record<string, unknown>,
          recipients,
          dedupeKey: buildReminderDedupeKey(
            setting.boardId,
            bundle.event,
            referenceDate,
          ),
          processNow: false,
        });

        if (result.queued) {
          queued += 1;
        } else if (result.duplicate) {
          duplicates += 1;
        }
      }
    } catch (error) {
      logWarn("board_email_notification.reminder_enqueue_failed", {
        boardId: setting.boardId,
        error,
      });
    }
  }

  return {
    boardsEvaluated,
    queued,
    duplicates,
    dateKey: getReminderDateKey(referenceDate),
  };
}
