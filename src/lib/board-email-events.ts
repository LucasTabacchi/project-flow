import { BOARD_EVENTS, type BoardEvent } from "@/lib/board-events";

export const BOARD_EMAIL_REMINDER_EVENTS = [
  "reminder.overdue",
  "reminder.upcoming",
  "reminder.inactive",
  "reminder.blocked",
] as const;

export type BoardEmailReminderEvent = (typeof BOARD_EMAIL_REMINDER_EVENTS)[number];

export const BOARD_EMAIL_NOTIFICATION_EVENTS = [
  ...BOARD_EVENTS,
  ...BOARD_EMAIL_REMINDER_EVENTS,
] as const;

export type BoardEmailNotificationEvent =
  (typeof BOARD_EMAIL_NOTIFICATION_EVENTS)[number];

export type BoardEmailNotificationPayload<
  EventName extends string = BoardEmailNotificationEvent,
> = {
  event: EventName;
  boardId: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export type BoardEmailReminderCardSummary = {
  cardId: string;
  title: string;
  listName: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeNames: string[];
  lastActivityAt?: string | null;
  inactiveDays?: number;
  overdueDays?: number;
  daysUntilDue?: number;
  blockedSince?: string | null;
  blockedDays?: number;
  blockedByTitles?: string[];
};

export type BoardEmailReminderPayloadData = {
  boardName: string;
  thresholdDays: number;
  cards: BoardEmailReminderCardSummary[];
};

export type BoardEmailReminderRuleKey =
  | "overdue"
  | "upcoming"
  | "inactive"
  | "blocked";

export const DEFAULT_BOARD_EMAIL_REMINDER_SETTINGS = {
  active: false,
  overdueEnabled: false,
  upcomingEnabled: false,
  upcomingDays: 3,
  inactiveEnabled: false,
  inactiveDays: 7,
  blockedEnabled: false,
  blockedDays: 3,
} as const;

export const BOARD_EMAIL_NOTIFICATION_EVENT_LABELS: Record<
  BoardEmailNotificationEvent,
  string
> = {
  "card.created": "Tarjeta creada",
  "card.moved": "Tarjeta movida",
  "card.status_changed": "Estado de tarjeta cambiado",
  "card.assigned": "Responsables asignados",
  "comment.added": "Comentario agregado",
  "list.created": "Lista creada",
  "member.joined": "Miembro unido",
  "reminder.overdue": "Recordatorio: tarjetas vencidas",
  "reminder.upcoming": "Recordatorio: vencimiento próximo",
  "reminder.inactive": "Recordatorio: sin actividad",
  "reminder.blocked": "Recordatorio: tarjetas bloqueadas",
};

export function isBoardEvent(event: BoardEmailNotificationEvent): event is BoardEvent {
  return BOARD_EVENTS.includes(event as BoardEvent);
}
