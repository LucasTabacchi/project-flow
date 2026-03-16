import Link from "next/link";
import { ArrowRight, Layers3, TriangleAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-card";
import {
  formatRelativeDistance,
  getBoardTheme,
  getRoleLabel,
  percentage,
} from "@/lib/utils";
import type { BoardSummary } from "@/types";

type BoardGridProps = {
  boards: BoardSummary[];
};

function getBoardInsight(board: BoardSummary) {
  if (board.overdueCards > 0) {
    return `${board.overdueCards} ${
      board.overdueCards === 1 ? "tarea vencida necesita" : "tareas vencidas necesitan"
    } atención inmediata.`;
  }

  if (board.completedCards > 0) {
    return `${board.completedCards} ${
      board.completedCards === 1 ? "tarea ya cerrada" : "tareas ya cerradas"
    } dentro de este flujo.`;
  }

  if (board.cardCount > 0) {
    return `${board.cardCount} tarjetas activas repartidas en ${board.listCount} listas.`;
  }

  return "Listo para sumar la primera tarjeta a este tablero.";
}

function getBoardMomentum(board: BoardSummary, completionRate: number) {
  if (board.overdueCards > 0) {
    return "Riesgo alto";
  }

  if (!board.cardCount) {
    return "Sin carga";
  }

  if (completionRate >= 75) {
    return "Buen ritmo";
  }

  if (completionRate >= 35) {
    return "En marcha";
  }

  return "Carga creciente";
}

export function BoardGrid({ boards }: BoardGridProps) {
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {boards.map((board, index) => {
        const theme = getBoardTheme(board.theme);
        const completionRate = percentage(board.completedCards, board.cardCount);
        const boardInsight = getBoardInsight(board);
        const boardMomentum = getBoardMomentum(board, completionRate);

        return (
          <Link
            key={board.id}
            href={`/boards/${board.id}`}
            prefetch={false}
            className="focus-ring group block min-w-0 rounded-[32px]"
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <Card className="animate-enter h-full min-w-0 overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)]">
              <CardHeader className="gap-4 pb-4">
                <div
                  className={`relative overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br p-5 text-white ${theme.gradientClass}`}
                >
                  <div className="absolute -right-10 -top-10 size-28 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/20 to-transparent" />
                  <div className="relative flex flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="border-white/15 bg-white/12 text-white shadow-none backdrop-blur-sm">
                          {getRoleLabel(board.role)}
                        </Badge>
                        <Badge className="border-white/15 bg-white/10 text-white/90 shadow-none backdrop-blur-sm">
                          {board.listCount} listas
                        </Badge>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/65">
                          Actualizado
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatRelativeDistance(board.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <CardTitle className="max-w-xl break-words text-[1.65rem] text-white sm:text-3xl">
                        {board.name}
                      </CardTitle>
                      <p className="mt-2 max-w-lg text-sm text-white/82">
                        {board.description || "Tablero sin descripción."}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">
                          Activas
                        </p>
                        <p className="mt-2 font-display text-2xl font-semibold text-white">
                          {board.cardCount}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">
                          Resueltas
                        </p>
                        <p className="mt-2 font-display text-2xl font-semibold text-white">
                          {completionRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 space-y-5">
                <div className={`rounded-[24px] border border-border/60 p-4 ${theme.surfaceClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Estado del flujo
                      </p>
                      <p className="mt-2 font-display text-3xl font-semibold">
                        {completionRate}%
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {board.completedCards} de {board.cardCount} tarjetas ya
                        quedaron resueltas.
                      </p>
                    </div>
                    <Badge className={theme.chipClass}>{boardMomentum}</Badge>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-background/60">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${theme.gradientClass}`}
                      style={{ width: `${Math.max(completionRate, board.cardCount ? 8 : 0)}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{boardInsight}</p>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <MetricTile
                    label="Miembros"
                    value={board.memberCount}
                    icon={Users}
                    hint={board.memberCount === 1 ? "1 persona visible" : `${board.memberCount} personas visibles`}
                  />
                  <MetricTile
                    label="Listas"
                    value={board.listCount}
                    icon={Layers3}
                    hint={
                      board.listCount === 1
                        ? "1 frente abierto"
                        : `${board.listCount} frentes abiertos`
                    }
                  />
                  <MetricTile
                    label="Vencidas"
                    value={board.overdueCards}
                    icon={TriangleAlert}
                    tone="warning"
                    hint={
                      board.overdueCards > 0
                        ? "requieren accion"
                        : "sin atrasos ahora"
                    }
                  />
                </div>

                <div className="flex flex-col items-start gap-2 border-t border-border/70 pt-4 text-sm font-medium sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">
                    {boardInsight}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 text-primary transition group-hover:translate-x-1">
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
