import Link from "next/link";
import { ArrowRight, CircleCheckBig, TriangleAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-card";
import { getBoardTheme, getRoleLabel } from "@/lib/utils";
import type { BoardSummary } from "@/types";

type BoardGridProps = {
  boards: BoardSummary[];
};

export function BoardGrid({ boards }: BoardGridProps) {
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {boards.map((board) => {
        const theme = getBoardTheme(board.theme);

        return (
          <Link
            key={board.id}
            href={`/boards/${board.id}`}
            prefetch={false}
            className="block min-w-0"
          >
            <Card className="h-full min-w-0 overflow-hidden transition hover:-translate-y-1">
              <CardHeader>
                <div
                  className={`mb-2 h-32 rounded-[24px] bg-gradient-to-br ${theme.gradientClass}`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={theme.chipClass}>{getRoleLabel(board.role)}</Badge>
                  <Badge variant="secondary">{board.listCount} listas</Badge>
                </div>
                <CardTitle className="mt-2 break-words">{board.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {board.description || "Tablero sin descripción."}
                </p>
              </CardHeader>
              <CardContent className="min-w-0 space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <MetricTile label="Miembros" value={board.memberCount} icon={Users} />
                  <MetricTile
                    label="Hechas"
                    value={board.completedCards}
                    icon={CircleCheckBig}
                    tone="success"
                  />
                  <MetricTile
                    label="Vencidas"
                    value={board.overdueCards}
                    icon={TriangleAlert}
                    tone="warning"
                  />
                </div>

                <div className="flex flex-col items-start gap-2 text-sm font-medium sm:flex-row sm:items-center sm:justify-between">
                  <span>{board.cardCount} tarjetas activas</span>
                  <span className="inline-flex shrink-0 items-center gap-2 text-primary">
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
