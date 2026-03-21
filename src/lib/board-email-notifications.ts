import "server-only";

import { BoardEmailNotificationJobStatus, Prisma } from "@prisma/client";

import { BOARD_EVENTS, type BoardEvent, type BoardEventPayload } from "@/lib/board-events";
import { prisma } from "@/lib/db";
import { sendBoardEventNotificationEmail } from "@/lib/email";
import { logError } from "@/lib/observability";

export const BOARD_EMAIL_NOTIFICATION_EVENTS = BOARD_EVENTS;
export type BoardEmailNotificationEvent = BoardEvent;
export type BoardEmailNotificationPayload = BoardEventPayload<BoardEmailNotificationEvent>;

export function normalizeEmailRecipients(recipients: string[]) {
  return [...new Set(recipients.map((value) => value.trim().toLowerCase()).filter(Boolean))];
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

  const result = await sendBoardEventNotificationEmail(
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

export async function enqueueBoardEmailNotificationJob(
  boardId: string,
  event: BoardEmailNotificationEvent,
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

    const payload: BoardEmailNotificationPayload = {
      event,
      boardId,
      timestamp: new Date().toISOString(),
      data,
    };

    const job = await prisma.boardEmailNotificationJob.create({
      data: {
        boardId,
        event,
        payload: payload as Prisma.InputJsonValue,
        recipients,
      },
      select: {
        id: true,
      },
    });

    void processPendingBoardEmailNotificationJobs(1).catch((error) => {
      logError("board_email_notification.enqueue_processing_failed", {
        boardId,
        event,
        jobId: job.id,
        error,
      });
    });
  } catch (error) {
    logError("board_email_notification.enqueue_failed", {
      boardId,
      event,
      error,
    });
  }
}
