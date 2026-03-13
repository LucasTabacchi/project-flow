import { notFound } from "next/navigation";

import { BoardWorkspace } from "@/components/boards/board-workspace";
import { requireUser } from "@/lib/auth/session";
import { getBoardPageData } from "@/lib/data/boards";

type BoardPageProps = {
  params: Promise<{
    boardId: string;
  }>;
};

export default async function BoardPage({ params }: BoardPageProps) {
  const user = await requireUser();
  const { boardId } = await params;
  const board = await getBoardPageData(boardId, user.id);

  if (!board) {
    notFound();
  }

  return <BoardWorkspace board={board} />;
}
