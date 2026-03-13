import type { BoardRole } from "@/types";

export function canEditBoard(role: BoardRole) {
  return role === "OWNER" || role === "EDITOR";
}

export function canManageMembers(role: BoardRole) {
  return role === "OWNER";
}

export function canDeleteBoard(role: BoardRole) {
  return role === "OWNER";
}
