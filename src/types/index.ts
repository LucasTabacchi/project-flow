import {
  BOARD_ROLES,
  CARD_PRIORITIES,
  CARD_STATUSES,
  LABEL_COLORS,
} from "@/lib/constants";

export type BoardRole = (typeof BOARD_ROLES)[number];
export type CardPriority = (typeof CARD_PRIORITIES)[number];
export type CardStatus = (typeof CARD_STATUSES)[number];
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

export type CardCommentView = {
  id: string;
  body: string;
  createdAt: string;
  author: UserSummary;
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
