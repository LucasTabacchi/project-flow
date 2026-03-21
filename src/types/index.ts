import {
  BOARD_ROLES,
  CARD_PRIORITIES,
  CARD_STATUSES,
  CUSTOM_FIELD_TYPES,
  LABEL_COLORS,
} from "@/lib/constants";

export type BoardRole = (typeof BOARD_ROLES)[number];
export type CardPriority = (typeof CARD_PRIORITIES)[number];
export type CardStatus = (typeof CARD_STATUSES)[number];
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export type LabelColor = (typeof LABEL_COLORS)[number];

export type UserSummary = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type BoardMemberView = UserSummary & {
  role: BoardRole;
};

export type BoardPresenceView = UserSummary & {
  activeCardId: string | null;
  activeField: string | null;
  sessionCount: number;
};

export type LabelView = {
  id: string;
  name: string;
  color: LabelColor;
};

export type BoardCustomFieldView = {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  position: number;
};

export type CardCustomFieldValueView = {
  fieldId: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  position: number;
  textValue: string | null;
  numberValue: number | null;
  optionValue: string | null;
  displayValue: string | null;
};

export type CardSummaryView = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: CardStatus;
  priority: CardPriority;
  labels: LabelView[];
  assignees: UserSummary[];
  commentCount: number;
  attachmentCount: number;
  checklistCompleted: number;
  checklistTotal: number;
  updatedAt: string;
  // ── Ronda 1 ──
  estimatedMinutes: number | null;
  trackedMinutes: number;
  customFields: CardCustomFieldValueView[];
};

export type BoardListView = {
  id: string;
  name: string;
  position: number;
  cards: CardSummaryView[];
};

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export type BoardInvitationView = {
  id: string;
  email: string;
  role: BoardRole;
  status: InvitationStatus;
  invitedByName: string;
  expiresAt: string;
};

export type BoardStats = {
  totalCards: number;
  completedCards: number;
  overdueCards: number;
  inProgressCards: number;
  byUser: Array<{
    userId: string;
    name: string;
    count: number;
  }>;
};

export type BoardPermissions = {
  canEdit: boolean;
  canManageMembers: boolean;
  canDelete: boolean;
};

export type BoardPageData = {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  backgroundColor: string | null;
  role: BoardRole;
  permissions: BoardPermissions;
  labels: LabelView[];
  customFields: BoardCustomFieldView[];
  members: BoardMemberView[];
  presence: BoardPresenceView[];
  invitations: BoardInvitationView[];
  stats: BoardStats;
  lists: BoardListView[];
  updatedAt: string;
};

export type BoardSummary = {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  role: BoardRole;
  memberCount: number;
  listCount: number;
  cardCount: number;
  completedCards: number;
  overdueCards: number;
  updatedAt: string;
};

export type SidebarBoardSummary = {
  id: string;
  name: string;
  theme: string;
  role: BoardRole;
  updatedAt: string;
};

export type PendingInvitation = {
  id: string;
  boardId: string;
  boardName: string;
  boardTheme: string;
  role: BoardRole;
  invitedByName: string;
  expiresAt: string;
};

export type InvitationAccessData = {
  id: string;
  token: string;
  email: string;
  boardId: string;
  boardName: string;
  boardTheme: string;
  role: BoardRole;
  invitedByName: string;
  status: InvitationStatus;
  expiresAt: string;
};

export type SearchCardView = {
  id: string;
  boardId: string;
  boardName: string;
  boardTheme: string;
  listId: string;
  listName: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: CardStatus;
  priority: CardPriority;
  labels: LabelView[];
  assignees: UserSummary[];
  isOverdue: boolean;
};

export type CalendarCardView = {
  id: string;
  boardId: string;
  boardName: string;
  boardTheme: string;
  listId: string;
  listName: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: CardStatus;
  priority: CardPriority;
  isOverdue: boolean;
};

export type SearchContextData = {
  boards: Array<{
    id: string;
    name: string;
    theme: string;
  }>;
  members: UserSummary[];
  labels: Array<{
    id: string;
    name: string;
    color: LabelColor;
  }>;
};

export type DashboardData = {
  boards: BoardSummary[];
  pendingInvitations: PendingInvitation[];
  upcomingCards: SearchCardView[];
  stats: {
    boardCount: number;
    totalCards: number;
    completedCards: number;
    overdueCards: number;
    dueSoonCards: number;
  };
};

export type TimeReportsBoardOption = {
  id: string;
  name: string;
  theme: string;
};

export type TimeReportsOverview = {
  totalCards: number;
  cardsWithEstimate: number;
  cardsWithoutEstimate: number;
  totalEstimatedMinutes: number;
  totalTrackedMinutes: number;
  varianceMinutes: number;
  variancePercentage: number | null;
  overBudgetCards: number;
  timeEntryCount: number;
  activeMembers: number;
};

export type TimeReportBoardSummary = {
  boardId: string;
  boardName: string;
  boardTheme: string;
  totalEstimatedMinutes: number;
  totalTrackedMinutes: number;
  varianceMinutes: number;
  variancePercentage: number | null;
  cardCount: number;
  cardsWithEstimate: number;
  overBudgetCards: number;
  timeEntryCount: number;
  activeMembers: number;
  lastLoggedAt: string | null;
};

export type TimeReportMemberSummary = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalTrackedMinutes: number;
  timeEntryCount: number;
  cardsWorkedCount: number;
  boardCount: number;
  lastLoggedAt: string | null;
};

export type TimeReportCardDeviationView = {
  cardId: string;
  boardId: string;
  boardName: string;
  boardTheme: string;
  listId: string;
  listName: string;
  title: string;
  status: CardStatus;
  priority: CardPriority;
  estimatedMinutes: number;
  trackedMinutes: number;
  varianceMinutes: number;
  variancePercentage: number;
  updatedAt: string;
  assignees: UserSummary[];
};

export type TimeReportsData = {
  boards: TimeReportsBoardOption[];
  selectedBoardId: string | null;
  selectedBoardName: string | null;
  overview: TimeReportsOverview;
  byBoard: TimeReportBoardSummary[];
  byMember: TimeReportMemberSummary[];
  topVarianceCards: TimeReportCardDeviationView[];
};

export type CommentReactionView = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  userNames: string[];
};

export type CardCommentView = {
  id: string;
  body: string;
  createdAt: string;
  author: UserSummary;
  reactions: CommentReactionView[];
};

export type ChecklistItemView = {
  id: string;
  title: string;
  position: number;
  isCompleted: boolean;
  completedAt: string | null;
};

export type ChecklistView = {
  id: string;
  title: string;
  position: number;
  items: ChecklistItemView[];
};

export type AttachmentView = {
  id: string;
  name: string;
  url: string;
  size: number | null;
  mimeType: string | null;
  createdAt: string;
};

// ── Ronda 1: tiempo tracking ──────────────────────────────────────────────────

export type TimeEntryView = {
  id: string;
  minutes: number;
  note: string | null;
  createdAt: string;
  user: UserSummary;
};

export type CardDependencyView = {
  dependencyId: string;
  cardId: string;
  listId: string;
  listName: string;
  title: string;
  dueDate: string | null;
  status: CardStatus;
  priority: CardPriority;
};

// ── Ronda 1: historial de tarjeta ─────────────────────────────────────────────

export type CardHistoryItem = {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl: string | null;
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export type CardDetailView = {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: CardStatus;
  priority: CardPriority;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  labels: LabelView[];
  assignees: UserSummary[];
  comments: CardCommentView[];
  checklists: ChecklistView[];
  attachments: AttachmentView[];
  blocking: CardDependencyView[];
  blockedBy: CardDependencyView[];
  // ── Ronda 1 ──
  estimatedMinutes: number | null;
  trackedMinutes: number;
  timeEntries: TimeEntryView[];
  customFields: CardCustomFieldValueView[];
};

export type ProfilePageData = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string;
  };
  stats: {
    boardCount: number;
    assignedCards: number;
    completedCards: number;
    commentCount: number;
  };
};
