import type { CardStatus, RecurrenceFrequency } from "@prisma/client";

import type { ActionResult } from "@/lib/action-result";

export type AuthActionState = ActionResult<{
  redirectTo: string;
}>;

export const ALLOWED_EMOJIS = ["👍", "❤️", "🎉", "😮", "😢", "🔥"] as const;

export type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  userNames: string[];
};

export type RecurringCardView = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  frequency: RecurrenceFrequency;
  nextDueAt: string;
  leadDays: number;
  active: boolean;
  listId: string;
  listName: string;
  createdAt: string;
};

export type TemplateCardSnapshot = {
  title: string;
  description: string | null;
  priority: string;
  status: string;
};

export type TemplateListSnapshot = {
  name: string;
  position: number;
  cards: TemplateCardSnapshot[];
};

export type TemplateSnapshot = {
  lists: TemplateListSnapshot[];
};

export type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  isPublic: boolean;
  listCount: number;
  cardCount: number;
  createdAt: string;
  isOwn: boolean;
};

export type BoardEmailNotificationJobView = {
  id: string;
  event: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type BoardEmailReminderSettingsView = {
  active: boolean;
  overdueEnabled: boolean;
  upcomingEnabled: boolean;
  upcomingDays: number;
  inactiveEnabled: boolean;
  inactiveDays: number;
  blockedEnabled: boolean;
  blockedDays: number;
};

export type BoardEmailNotificationSettingsView = {
  active: boolean;
  recipients: string[];
  events: string[];
  reminders: BoardEmailReminderSettingsView;
  updatedAt: string | null;
  recentJobs: BoardEmailNotificationJobView[];
};

export type BoardAutomationRuleView = {
  id: string;
  name: string;
  active: boolean;
  triggerType: "CARD_STATUS_CHANGED";
  triggerStatus: CardStatus;
  moveToListId: string | null;
  moveToListName: string | null;
  assignUserIds: string[];
  dueInDays: number | null;
  emailRecipients: string[];
  createdAt: string;
  updatedAt: string;
};
