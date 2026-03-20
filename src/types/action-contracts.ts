import type { RecurrenceFrequency } from "@prisma/client";

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
