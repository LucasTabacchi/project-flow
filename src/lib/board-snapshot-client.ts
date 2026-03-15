import type { BoardPageData } from "@/types";

export class BoardSnapshotRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BoardSnapshotRequestError";
  }
}

export async function fetchBoardSnapshot(
  boardId: string,
): Promise<BoardPageData> {
  const response = await fetch(`/api/boards/${boardId}/snapshot`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new BoardSnapshotRequestError(
      "No pudimos sincronizar el tablero.",
      response.status,
    );
  }

  return (await response.json()) as BoardPageData;
}
