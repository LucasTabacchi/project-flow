import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getUserSidebarBoards } from "@/lib/data/boards";
import { getBoardTheme, getRoleLabel } from "@/lib/utils";

type SidebarBoardsSectionProps = {
  userId: string;
};

export async function SidebarBoardsSection({
  userId,
}: SidebarBoardsSectionProps) {
  const boards = await getUserSidebarBoards(userId);

  return (
    <>
      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Tableros activos</p>
          <p className="text-xs text-muted-foreground">
            Acceso rápido a tus proyectos
          </p>
        </div>
        <Badge variant="secondary">{boards.length}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {boards.length ? (
          boards.map((board) => {
            const theme = getBoardTheme(board.theme);

            return (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                prefetch={false}
                className="glass-panel flex items-start gap-3 rounded-[24px] border border-border p-4 transition hover:-translate-y-0.5"
              >
                <div
                  className={`mt-1 size-3 rounded-full bg-gradient-to-r ${theme.gradientClass}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{board.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getRoleLabel(board.role)}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-card/60 px-4 py-5 text-sm text-muted-foreground">
            Tus tableros recientes van a aparecer acá.
          </div>
        )}
      </div>
    </>
  );
}
