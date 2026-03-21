export const WEBHOOK_EVENTS = [
  "card.created",
  "card.moved",
  "card.status_changed",
  "card.assigned",
  "comment.added",
  "list.created",
  "member.joined",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type BoardEventPayload<EventName extends string = WebhookEvent> = {
  event: EventName;
  boardId: string;
  timestamp: string;
  data: Record<string, unknown>;
};
