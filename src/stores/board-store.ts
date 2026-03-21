"use client";

import { create } from "zustand";

import type {
  BoardListView,
  BoardPresenceView,
  BoardPageData,
  CardPriority,
  CardStatus,
} from "@/types";

type BoardFilters = {
  query: string;
  labelId: string;
  assigneeId: string;
  priority: CardPriority | "ALL";
  status: CardStatus | "ALL";
  overdueOnly: boolean;
};

type BoardStore = {
  board: BoardPageData | null;
  filters: BoardFilters;
  selectedCardId: string | null;
  hydrateBoard: (board: BoardPageData) => void;
  mutateBoard: (updater: (board: BoardPageData) => BoardPageData) => void;
  setLists: (lists: BoardListView[]) => void;
  setPresence: (presence: BoardPresenceView[]) => void;
  setFilters: (filters: Partial<BoardFilters>) => void;
  resetFilters: () => void;
  openCard: (cardId: string) => void;
  closeCard: () => void;
};

const defaultFilters: BoardFilters = {
  query: "",
  labelId: "ALL",
  assigneeId: "ALL",
  priority: "ALL",
  status: "ALL",
  overdueOnly: false,
};

export const useBoardStore = create<BoardStore>((set) => ({
  board: null,
  filters: { ...defaultFilters },
  selectedCardId: null,
  hydrateBoard: (board) =>
    set((state) => ({
      board,
      selectedCardId:
        state.selectedCardId &&
        board.lists.some((list) =>
          list.cards.some((card) => card.id === state.selectedCardId),
        )
          ? state.selectedCardId
          : null,
    })),
  mutateBoard: (updater) =>
    set((state) => {
      if (!state.board) {
        return {};
      }

      const nextBoard = updater(state.board);
      const nextSelectedCardId =
        state.selectedCardId &&
        nextBoard.lists.some((list) =>
          list.cards.some((card) => card.id === state.selectedCardId),
        )
          ? state.selectedCardId
          : null;

      return {
        board: nextBoard,
        selectedCardId: nextSelectedCardId,
      };
    }),
  setLists: (lists) =>
    set((state) => ({
      board: state.board
        ? {
            ...state.board,
            lists,
          }
        : null,
    })),
  setPresence: (presence) =>
    set((state) => ({
      board: state.board
        ? {
            ...state.board,
            presence,
          }
        : null,
    })),
  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  resetFilters: () =>
    set({
      filters: { ...defaultFilters },
    }),
  openCard: (cardId) => set({ selectedCardId: cardId }),
  closeCard: () => set({ selectedCardId: null }),
}));
