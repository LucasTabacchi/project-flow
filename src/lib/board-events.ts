export const BOARD_EVENTS = [
  "card.created",
  "card.moved",
  "card.status_changed",
  "card.assigned",
  "comment.added",
  "list.created",
  "member.joined",
] as const;

export type BoardEvent = (typeof BOARD_EVENTS)[number];

export type BoardEventPayload<EventName extends string = BoardEvent> = {
  event: EventName;
  boardId: string;
  timestamp: string;
  data: Record<string, unknown>;
};
