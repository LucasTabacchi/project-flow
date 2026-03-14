import Link from "next/link";
import { ArrowRight, CircleCheckBig, TriangleAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBoardTheme, getRoleLabel } from "@/lib/utils";
import type { BoardSummary } from "@/types";

type BoardGridProps = {
  boards: BoardSummary[];
};

export function BoardGrid({ boards }: BoardGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {boards.map((board) => {
        const theme = getBoardTheme(board.theme);

        return (
          <Link key={board.id} href={`/boards/${board.id}`} prefetch>
            <Card className="h-full transition hover:-translate-y-1">
              <CardHeader>
                <div
                  className={`mb-2 h-32 rounded-[24px] bg-gradient-to-br ${theme.gradientClass}`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={theme.chipClass}>{getRoleLabel(board.role)}</Badge>
                  <Badge variant="secondary">{board.listCount} listas</Badge>
                </div>
                <CardTitle className="mt-2">{board.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {board.description || "Tablero sin descripción."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-[20px] border border-border bg-background/70 p-3">
                    <p className="text-muted-foreground">Miembros</p>
                    <p className="mt-1 flex items-center gap-2 font-semibold">
                      <Users className="size-4 text-primary" />
                      {board.memberCount}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-border bg-background/70 p-3">
                    <p className="text-muted-foreground">Hechas</p>
                    <p className="mt-1 flex items-center gap-2 font-semibold">
                      <CircleCheckBig className="size-4 text-emerald-500" />
                      {board.completedCards}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-border bg-background/70 p-3">
                    <p className="text-muted-foreground">Vencidas</p>
                    <p className="mt-1 flex items-center gap-2 font-semibold">
                      <TriangleAlert className="size-4 text-amber-500" />
                      {board.overdueCards}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 text-sm font-medium sm:flex-row sm:items-center sm:justify-between">
                  <span>{board.cardCount} tarjetas activas</span>
                  <span className="inline-flex items-center gap-2 text-primary">
                    Abrir tablero
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
