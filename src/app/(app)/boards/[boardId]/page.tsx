import { Suspense } from "react";
import { notFound } from "next/navigation";

import { BoardWorkspace } from "@/components/boards/board-workspace";
import BoardLoading from "@/app/(app)/boards/[boardId]/loading";
import { requireUser } from "@/lib/auth/session";
import { getBoardPageData } from "@/lib/data/boards";

type BoardPageProps = {
  params: Promise<{
    boardId: string;
  }>;
};

async function BoardPageContent({
  boardPromise,
}: {
  boardPromise: ReturnType<typeof getBoardPageData>;
}) {
  const board = await boardPromise;

  if (!board) {
    notFound();
  }

  return <BoardWorkspace board={board} />;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const [user, { boardId }] = await Promise.all([requireUser(), params]);
  const boardPromise = getBoardPageData(boardId, user.id);

  return (
    <Suspense fallback={<BoardLoading />}>
      <BoardPageContent boardPromise={boardPromise} />
    </Suspense>
  );
}
