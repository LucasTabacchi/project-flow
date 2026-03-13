import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

import {
  BOARD_THEMES,
  PRIORITY_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";
import type { BoardRole, CardPriority, CardStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDueDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (isToday(date)) {
    return "Hoy";
  }

  if (isTomorrow(date)) {
    return "Mañana";
  }

  return format(date, "dd MMM", { locale: es });
}

export function formatFullDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "dd 'de' MMMM, yyyy", { locale: es });
}

export function formatRelativeDistance(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: es });
}

export function isCardOverdue(
  dueDate: Date | string | null | undefined,
  status?: CardStatus,
) {
  if (!dueDate || status === "DONE") {
    return false;
  }

  return isPast(typeof dueDate === "string" ? new Date(dueDate) : dueDate);
}

export function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function percentage(completed: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

export function getRoleLabel(role: BoardRole) {
  return ROLE_LABELS[role];
}

export function getPriorityLabel(priority: CardPriority) {
  return PRIORITY_LABELS[priority];
}

export function getStatusLabel(status: CardStatus) {
  return STATUS_LABELS[status];
}

export function getBoardTheme(theme: string) {
  return BOARD_THEMES.find((item) => item.value === theme) ?? BOARD_THEMES[0];
}
