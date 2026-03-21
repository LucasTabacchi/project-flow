"use server";

import { BoardEmailNotificationJobStatus } from "@prisma/client";
import { z } from "zod";

import { failure, fromZodError, success, type ActionResult } from "@/lib/action-result";
import { normalizeEmailRecipients } from "@/lib/board-email-notifications";
import { requireUser } from "@/lib/auth/session";
import { DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS } from "@/lib/board-email-events";
import { BOARD_EVENTS } from "@/lib/board-events";
import { getBoardMembership } from "@/lib/data/boards";
import { prisma } from "@/lib/db";
import type { BoardEmailNotificationSettingsView } from "@/types/action-contracts";

const entityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/);

const reminderThresholdSchema = z
  .number()
  .int("Ingresá un número entero.")
  .min(1, "El umbral mínimo es 1 día.")
  .max(60, "El umbral máximo es 60 días.");

const updateBoardEmailNotificationSettingsSchema = z.object({
  boardId: entityIdSchema,
  recipients: z
    .array(z.string().trim().email("Ingresá un email válido."))
    .max(10, "Podés configurar hasta 10 destinatarios por tablero."),
  events: z
    .array(z.enum(BOARD_EVENTS))
    .max(BOARD_EVENTS.length),
  active: z.boolean(),
  reminders: z.object({
    active: z.boolean(),
    overdueEnabled: z.boolean(),
    upcomingEnabled: z.boolean(),
    upcomingDays: reminderThresholdSchema,
    inactiveEnabled: z.boolean(),
    inactiveDays: reminderThresholdSchema,
    blockedEnabled: z.boolean(),
    blockedDays: reminderThresholdSchema,
  }),
}).superRefine((value, ctx) => {
  if (value.active && value.recipients.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recipients"],
      message: "Agregá al menos un destinatario para activar los emails.",
    });
  }

  if (value.active && value.events.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["events"],
      message: "Seleccioná al menos un evento para activar los emails.",
    });
  }

  if (value.reminders.active && value.recipients.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recipients"],
      message: "Agregá al menos un destinatario para activar recordatorios.",
    });
  }

  if (
    value.reminders.active &&
    !value.reminders.overdueEnabled &&
    !value.reminders.upcomingEnabled &&
    !value.reminders.inactiveEnabled &&
    !value.reminders.blockedEnabled
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reminders"],
      message: "Seleccioná al menos una regla para activar recordatorios.",
    });
  }
});

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

function serializeSettings(input: {
  active: boolean;
  recipients: string[];
  events: string[];
  reminders: {
    active: boolean;
    overdueEnabled: boolean;
    upcomingEnabled: boolean;
    upcomingDays: number;
    inactiveEnabled: boolean;
    inactiveDays: number;
    blockedEnabled: boolean;
    blockedDays: number;
  };
  updatedAt: Date | null;
  recentJobs: Array<{
    id: string;
    event: string;
    status: BoardEmailNotificationJobStatus;
    attempts: number;
    lastError: string | null;
    createdAt: Date;
    sentAt: Date | null;
  }>;
}): BoardEmailNotificationSettingsView {
  return {
    active: input.active,
    recipients: input.recipients,
    events: input.events,
    reminders: input.reminders,
    updatedAt: input.updatedAt?.toISOString() ?? null,
    recentJobs: input.recentJobs.map((job) => ({
      id: job.id,
      event: job.event,
      status: job.status,
      attempts: job.attempts,
      lastError: job.lastError,
      createdAt: job.createdAt.toISOString(),
      sentAt: job.sentAt?.toISOString() ?? null,
    })),
  };
}

export async function getBoardEmailNotificationSettingsAction(
  boardId: string,
): Promise<ActionResult<{ settings: BoardEmailNotificationSettingsView }>> {
  const user = await requireUser();
  const guard = await requireOwner(boardId, user.id);

  if (!guard) {
    return failure("No tenés acceso a este tablero.");
  }

  if (guard === "forbidden") {
    return failure("Solo el propietario puede gestionar emails del tablero.");
  }

  const [setting, recentJobs] = await Promise.all([
    prisma.boardEmailNotificationSetting.findUnique({
      where: { boardId },
      select: {
        active: true,
        recipients: true,
        events: true,
        remindersActive: true,
        overdueReminderEnabled: true,
        upcomingReminderEnabled: true,
        upcomingReminderDays: true,
        inactiveReminderEnabled: true,
        inactiveReminderDays: true,
        blockedReminderEnabled: true,
        blockedReminderDays: true,
        updatedAt: true,
      },
    }),
    prisma.boardEmailNotificationJob.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        event: true,
        status: true,
        attempts: true,
        lastError: true,
        createdAt: true,
        sentAt: true,
      },
    }),
  ]);

  return success({
    settings: serializeSettings({
      active: setting?.active ?? false,
      recipients: setting?.recipients ?? [],
      events: setting?.events ?? [...BOARD_EVENTS],
      reminders: {
        active: setting?.remindersActive ?? DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.active,
        overdueEnabled:
          setting?.overdueReminderEnabled ??
          DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.overdueEnabled,
        upcomingEnabled:
          setting?.upcomingReminderEnabled ??
          DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.upcomingEnabled,
        upcomingDays:
          setting?.upcomingReminderDays ??
          DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.upcomingDays,
        inactiveEnabled:
          setting?.inactiveReminderEnabled ??
          DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.inactiveEnabled,
        inactiveDays:
          setting?.inactiveReminderDays ??
          DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.inactiveDays,
        blockedEnabled:
          setting?.blockedReminderEnabled ??
          DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.blockedEnabled,
        blockedDays:
          setting?.blockedReminderDays ??
          DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS.blockedDays,
      },
      updatedAt: setting?.updatedAt ?? null,
      recentJobs,
    }),
  });
}

export async function updateBoardEmailNotificationSettingsAction(
  input: unknown,
): Promise<ActionResult<{ settings: BoardEmailNotificationSettingsView }>> {
  const user = await requireUser();
  const parsed = updateBoardEmailNotificationSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const guard = await requireOwner(parsed.data.boardId, user.id);

  if (!guard) {
    return failure("No tenés acceso a este tablero.");
  }

  if (guard === "forbidden") {
    return failure("Solo el propietario puede gestionar emails del tablero.");
  }

  const recipients = normalizeEmailRecipients(parsed.data.recipients);
  const events = [...new Set(parsed.data.events)];

  const setting = await prisma.boardEmailNotificationSetting.upsert({
    where: { boardId: parsed.data.boardId },
    create: {
      boardId: parsed.data.boardId,
      recipients,
      events,
      active: parsed.data.active,
      remindersActive: parsed.data.reminders.active,
      overdueReminderEnabled: parsed.data.reminders.overdueEnabled,
      upcomingReminderEnabled: parsed.data.reminders.upcomingEnabled,
      upcomingReminderDays: parsed.data.reminders.upcomingDays,
      inactiveReminderEnabled: parsed.data.reminders.inactiveEnabled,
      inactiveReminderDays: parsed.data.reminders.inactiveDays,
      blockedReminderEnabled: parsed.data.reminders.blockedEnabled,
      blockedReminderDays: parsed.data.reminders.blockedDays,
    },
    update: {
      recipients,
      events,
      active: parsed.data.active,
      remindersActive: parsed.data.reminders.active,
      overdueReminderEnabled: parsed.data.reminders.overdueEnabled,
      upcomingReminderEnabled: parsed.data.reminders.upcomingEnabled,
      upcomingReminderDays: parsed.data.reminders.upcomingDays,
      inactiveReminderEnabled: parsed.data.reminders.inactiveEnabled,
      inactiveReminderDays: parsed.data.reminders.inactiveDays,
      blockedReminderEnabled: parsed.data.reminders.blockedEnabled,
      blockedReminderDays: parsed.data.reminders.blockedDays,
    },
    select: {
      active: true,
      recipients: true,
      events: true,
      remindersActive: true,
      overdueReminderEnabled: true,
      upcomingReminderEnabled: true,
      upcomingReminderDays: true,
      inactiveReminderEnabled: true,
      inactiveReminderDays: true,
      blockedReminderEnabled: true,
      blockedReminderDays: true,
      updatedAt: true,
    },
  });

  const recentJobs = await prisma.boardEmailNotificationJob.findMany({
    where: { boardId: parsed.data.boardId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      event: true,
      status: true,
      attempts: true,
      lastError: true,
      createdAt: true,
      sentAt: true,
    },
  });

  return success(
    {
      settings: serializeSettings({
        active: setting.active,
        recipients: setting.recipients,
        events: setting.events,
        reminders: {
          active: setting.remindersActive,
          overdueEnabled: setting.overdueReminderEnabled,
          upcomingEnabled: setting.upcomingReminderEnabled,
          upcomingDays: setting.upcomingReminderDays,
          inactiveEnabled: setting.inactiveReminderEnabled,
          inactiveDays: setting.inactiveReminderDays,
          blockedEnabled: setting.blockedReminderEnabled,
          blockedDays: setting.blockedReminderDays,
        },
        updatedAt: setting.updatedAt,
        recentJobs,
      }),
    },
    "Notificaciones por email actualizadas.",
  );
}
